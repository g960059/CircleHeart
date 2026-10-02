import { describe, expect, it, vi } from "vitest";
import {
  hotPathIntegrityTierV1,
  selectHotPathIntegrityTierV1,
} from "@/engine/hotPathIntegrityTierV1";
import {
  selectValidationStampModeV1,
  validationStampModeV1,
} from "@/engine/validationStampModeV1";
import {
  MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
  projectMainWireIntegratedModelSelectedValuesV3,
} from "@/engine/myocardium/MainWireIntegratedModelOutputRegistryV3";
import {
  MainWireIntegratedModelSessionV3,
  mainWireIntegratedModelPresentationTargetTimeSecV3,
} from "@/engine/myocardium/MainWireIntegratedModelSessionV3";
import {
  mainWireFiveWallCoronaryBaseStateV2,
} from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV3";
import {
  createMainWireIntegratedModelRuntimeV3,
} from "@/engine/myocardium/MainWireIntegratedModelRuntimeV3";
import {
  createAcceptedComposedRhythmTransactionConfigurationV2,
  createNoExternalAtrialSourceBatchV2,
  evaluateAcceptedComposedRhythmTransactionCandidateV2,
} from "@/engine/myocardium/rhythm/acceptedComposedRhythmTransactionV2";
import {
  createAcceptedAuthoredEctopyScheduleConfigurationV2,
  evaluateAcceptedAuthoredEctopyScheduleTrialV2,
  initializeAcceptedAuthoredEctopyScheduleStateV2,
} from "@/engine/myocardium/rhythm/acceptedAuthoredEctopyScheduleV2";
import {
  createAcceptedAuthoredVentricularPacingReplaySourceConfigurationV1,
  evaluateAcceptedAuthoredVentricularPacingReplaySourceTrialV1,
  initializeAcceptedAuthoredVentricularPacingReplaySourceStateV1,
} from "@/engine/myocardium/rhythm/acceptedAuthoredVentricularPacingReplaySourceV1";
import {
  evaluateAcceptedRegularAtrialSourceCandidateV1,
  type CapturedPacSinusClockPolicyV1,
} from "@/engine/myocardium/rhythm/acceptedRegularAtrialSourceOwnerV1";
import {
  evaluateMainWireIntegratedModelCalciumDriveV3,
  limitMainWireIntegratedModelCandidateTimeV3,
} from "@/engine/myocardium/MainWireIntegratedModelTransactionV3";
import {
  decodeCanonicalFlatCheckpointV1,
  decodeCanonicalFlatDataV1,
  encodeCanonicalFlatCheckpointV1,
  encodeCanonicalFlatDataIntoV1,
  measureCanonicalFlatDataV1,
} from "@/engine/vnext/CanonicalFlatDataV1";
import {
  MainWireIntegratedTypedAuthoritySessionV1,
} from "@/engine/vnext/MainWireIntegratedTypedAuthoritySessionV1";
import {
  MainWireFlatCoupledAcceptedStateV1,
} from "@/engine/vnext/coupled/MainWireFlatCoupledAcceptedStateV1";
import {
  createMainWireAcceptedTypedBoundaryBindingV1,
  evaluateMainWireAcceptedTypedCalciumDriveV1,
  limitMainWireAcceptedTypedCandidateTimeV1,
  readMainWireAcceptedTypedClockV1,
  stageMainWireAcceptedTypedAuthoredScheduleCandidateV1,
  stageMainWireAcceptedTypedCalciumCandidateV1,
  stageMainWireAcceptedTypedClockCandidateV1,
  stageMainWireAcceptedTypedOrdinaryPostSolverCandidateV1,
  stageMainWireAcceptedTypedRegularAtrialCandidateV1,
  stageMainWireAcceptedTypedResolvedCandidateV1,
} from "@/engine/vnext/MainWireAcceptedTypedBoundaryV1";
import {
  createMainWireAcceptedTypedHemodynamicBindingV1,
  createMainWireAcceptedTypedHemodynamicDestinationV1,
  MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_LAYOUT_V1,
  materializeMainWireAcceptedTypedCoupledSolverAdapterV1,
  readMainWireAcceptedTypedHemodynamicIntoV1,
  stageMainWireAcceptedTypedCoupledCandidateV1,
} from "@/engine/vnext/MainWireAcceptedTypedHemodynamicV1";
import {
  CORONARY_LAYER_IDS_V2,
  CORONARY_TERRITORY_IDS_V2,
} from "@/engine/coronary/typesV2";
import {
  MAIN_WIRE_FIVE_WALL_IDS_V1,
} from "@/engine/myocardium/mechanics/MainWireFiveWallLandTriSegProviderV1";
import {
  NON_CORONARY_DYNAMIC_EDGE_NAMES_V1,
  NON_CORONARY_NODE_NAMES_V1,
  NON_CORONARY_VALVE_NAMES_V1,
} from "@/engine/core/nonCoronaryCirculationBackwardEulerV1";
import {
  createMainWireAcceptedTypedStateManifestV1,
  MainWireAcceptedTypedStateAuthorityV1,
} from "@/engine/vnext/MainWireAcceptedTypedStateV1";
import {
  createTransactionalTypedStateManifestV1,
  assertTransactionalTypedStateManifestIssuedV1,
  TransactionalTypedStateImageV1,
} from "@/engine/vnext/TransactionalTypedStateImageV1";
import {
  bindExecutionPlanV1,
} from "@/runtime/executionPlan/BoundExecutionPlanV1";
import type {
  ExecutionPlanDescriptorV1,
} from "@/runtime/executionPlan/ExecutionPlanDescriptorV1";
import {
  bindExecutionPlanAcceptedTypedStateV1,
  readExecutionPlanAcceptedTypedStateIntoLogicalV1,
  resolveExecutionPlanAcceptedTypedStateSlotV1,
} from "@/engine/vnext/ExecutionPlanAcceptedTypedStateBindingV1";
import {
  compileExecutionPlanV1,
} from "@/engine/executionPlan/ExecutionPlanCompilerV1";
import {
  createMainWireModelDefinitionV1,
  createMainWireNumericalPolicyV1,
} from "@/engine/executionPlan/MainWireModelDefinitionV1";

describe("CanonicalFlatDataV1", () => {
  it("encodes an owned ArrayBuffer when SharedArrayBuffer is unavailable", () => {
    const sharedArrayBuffer = globalThis.SharedArrayBuffer;
    vi.stubGlobal("SharedArrayBuffer", undefined);
    try {
      const destination = new Uint8Array(
        measureCanonicalFlatDataV1(Object.freeze({ value: 1 })),
      );
      expect(() => encodeCanonicalFlatDataIntoV1(
        Object.freeze({ value: 1 }),
        destination,
      )).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
    expect(globalThis.SharedArrayBuffer).toBe(sharedArrayBuffer);
  });

  it("owns one canonical encoding without invoking accessors", async () => {
    const first = Object.freeze({
      z: Object.freeze([true, null, "循環"]),
      a: new Float64Array([0, -0, 1.25]),
      nested: Object.freeze({ count: 3 }),
    });
    const second = Object.freeze({
      nested: Object.freeze({ count: 3 }),
      a: new Float64Array([0, -0, 1.25]),
      z: Object.freeze([true, null, "循環"]),
    });
    const length = measureCanonicalFlatDataV1(first);
    const firstBytes = new Uint8Array(length);
    const secondBytes = new Uint8Array(length);
    expect(encodeCanonicalFlatDataIntoV1(first, firstBytes)).toBe(length);
    expect(encodeCanonicalFlatDataIntoV1(second, secondBytes)).toBe(length);
    expect(firstBytes).toEqual(secondBytes);
    expect(() => decodeCanonicalFlatDataV1(
      new Uint8Array([...firstBytes, 0]),
    )).toThrow("trailing bytes");
    const duplicateKey = new Uint8Array(64);
    const duplicateLength = encodeCanonicalFlatDataIntoV1(
      Object.freeze({ a: 1, b: 2 }),
      duplicateKey,
    );
    const lastB = duplicateKey.lastIndexOf("b".charCodeAt(0));
    expect(lastB).toBeGreaterThan(0);
    duplicateKey[lastB] = "a".charCodeAt(0);
    expect(() => decodeCanonicalFlatDataV1(duplicateKey, duplicateLength))
      .toThrow("not strictly ordered");
    const decoded = decodeCanonicalFlatDataV1(firstBytes) as typeof first;
    expect(decoded.z).toEqual(first.z);
    expect(decoded.a).toEqual(first.a);
    expect(Object.is(decoded.a[1], -0)).toBe(true);
    expect(Object.isFrozen(decoded)).toBe(true);
    expect(Object.isFrozen(decoded.z)).toBe(true);

    const checkpoint = await encodeCanonicalFlatCheckpointV1(first);
    expect(await decodeCanonicalFlatCheckpointV1(checkpoint)).toEqual(decoded);
    const inFlightCheckpoint = checkpoint.slice();
    const inFlightDecode = decodeCanonicalFlatCheckpointV1(inFlightCheckpoint);
    inFlightCheckpoint.fill(0);
    expect(await inFlightDecode).toEqual(decoded);
    const tampered = checkpoint.slice();
    tampered[tampered.length - 1] ^= 1;
    await expect(decodeCanonicalFlatCheckpointV1(tampered))
      .rejects.toThrow("SHA-256 mismatch");

    let getterCalls = 0;
    const accessor = Object.defineProperty({}, "value", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    expect(() => measureCanonicalFlatDataV1(accessor)).toThrow("is an accessor");
    expect(getterCalls).toBe(0);
  });
});

describe("TransactionalTypedStateImageV1", () => {
  it("distinguishes compiler-issued manifests from structurally identical or forged storage metadata", () => {
    const manifest = createTransactionalTypedStateManifestV1("test-issued-manifest", { value: 1 }, 64, 64);
    expect(() => assertTransactionalTypedStateManifestIssuedV1(manifest)).not.toThrow();
    expect(() => assertTransactionalTypedStateManifestIssuedV1(Object.freeze({ ...manifest }))).toThrow("not factory-issued");
    expect(() => assertTransactionalTypedStateManifestIssuedV1(Object.freeze({ ...manifest,
      imageLayout: Object.freeze({ ...manifest.imageLayout, continuousByteOffset: manifest.imageLayout.booleanByteOffset }),
    }))).toThrow("not factory-issued");
  });

  it("completes one fixed root with required-write coverage and independent sibling staging", () => {
    const initial = { selected: { label: "fixed", samples: new Float64Array([2, 3]), open: true }, sibling: { value: 11 } };
    const manifest = createTransactionalTypedStateManifestV1("test-root-completion", initial, 64, 64);
    const image = new TransactionalTypedStateImageV1(manifest, initial);
    const root = image.createRootCompletionPlan("selected");
    const siblingSlot = manifest.numericalLayout.continuousSlots.findIndex(slot => slot.pointer === "/sibling/value");
    const promotion = image.createPromotionPlan({ continuous: [...root.requiredContinuousSlots, siblingSlot],
      nullableContinuous: root.requiredNullableContinuousSlots, booleans: root.requiredBooleanSlots });
    const next = { label: "fixed", samples: new Float64Array([5, 6]), open: false };
    const cursor = image.beginCandidateFromCurrent();
    cursor.writeContinuous(siblingSlot, 12);
    expect(() => image.promoteCandidateWithRequiredWrites(promotion)).toThrow();
    image.completeCandidateRootFromObject(next, root);
    expect(image.rehydrateCurrent()).toEqual(initial);
    expect(image.rehydrateStaged()).toEqual({ selected: next, sibling: { value: 12 } });
    next.samples[0] = 99;
    image.promoteCandidateWithRequiredWrites(promotion);
    expect(image.rehydrateCurrent()).toEqual({ selected: { ...next, samples: new Float64Array([5, 6]) }, sibling: { value: 12 } });
    expect(() => image.completeCandidateRootFromObject(next, root)).toThrow();
    expect(() => cursor.writeContinuous(siblingSlot, 13)).toThrow();
  });

  it("rejects fixed-root forgery, topology drift and invalid values before any root write", () => {
    const initial = { selected: { label: "fixed", values: [2, 3], open: true }, sibling: 11 };
    const manifest = createTransactionalTypedStateManifestV1("test-root-completion-shape", initial, 64, 64,
      { fixedArrayPointers: ["/selected/values"] });
    const image = new TransactionalTypedStateImageV1(manifest, initial);
    const root = image.createRootCompletionPlan("selected");
    const foreign = new TransactionalTypedStateImageV1(
      createTransactionalTypedStateManifestV1("test-root-completion-shape", initial, 64, 64,
        { fixedArrayPointers: ["/selected/values"] }), initial).createRootCompletionPlan("selected");
    let getterReads = 0;
    const accessor = Object.defineProperty({ ...initial.selected }, "open", { enumerable: true, get() { getterReads++; return true; } });
    const hole = [2, 3]; delete hole[0];
    const invalidRoots: unknown[] = [
      { ...initial.selected, label: "other" }, { ...initial.selected, extra: 1 },
      { ...initial.selected, values: [NaN, 3] }, { ...initial.selected, open: 1 },
      { ...initial.selected, values: [2] }, { ...initial.selected, values: new Float64Array([2, 3]) },
      { ...initial.selected, values: Object.assign(Object.create(Array.prototype), { 0: 2, 1: 3, length: 2 }) },
      { ...initial.selected, values: hole }, Object.assign(Object.create(null), initial.selected), accessor,
    ];
    image.beginCandidateFromCurrent();
    for (const plan of [{ ...root }, foreign]) expect(() => image.completeCandidateRootFromObject(initial.selected, plan)).toThrow("wrong layout");
    for (const invalid of invalidRoots) {
      expect(() => image.completeCandidateRootFromObject(invalid, root)).toThrow();
      expect(image.rehydrateStaged()).toEqual(initial);
    }
    expect(getterReads).toBe(0);
    image.completeCandidateRootFromObject({ ...initial.selected, values: [7, 8] }, root);
    image.abort();
    expect(image.rehydrateCurrent()).toEqual(initial);
    expect(() => image.createRootCompletionPlan("missing" as "selected")).toThrow("unavailable");
    const dynamic = new TransactionalTypedStateImageV1(
      createTransactionalTypedStateManifestV1("test-variable-root-completion", initial, 64, 128), initial);
    expect(() => dynamic.createRootCompletionPlan("selected")).toThrow("does not support");
  });

  it("rehydrates only an accepted root with detached mutable arrays across promotion and abort", () => {
    const initial = {
      selected: { samples: new Float64Array([2, 3]), nested: { value: 7 } },
      sibling: { value: 11 },
    };
    const image = new TransactionalTypedStateImageV1(
      createTransactionalTypedStateManifestV1("test-root-reader", initial, 8, 64),
      initial,
    );
    const first = image.rehydrateCurrentRoot("selected");
    expect(first).toEqual(image.rehydrateCurrent().selected);
    expect(first.samples).not.toBe(image.rehydrateCurrentRoot("selected").samples);
    first.samples[0] = 99;
    expect(() => Object.assign(first.nested, { value: 99 })).toThrow(TypeError);
    expect(image.rehydrateCurrentRoot("selected")).toEqual(initial.selected);
    const candidate = { selected: { samples: new Float64Array([5, 6]), nested: { value: 8 } }, sibling: { value: 12 } };
    image.stage(candidate);
    expect(image.rehydrateCurrentRoot("selected")).toEqual(initial.selected);
    image.abort();
    expect(image.rehydrateCurrentRoot("selected")).toEqual(initial.selected);
    image.stage(candidate);
    image.promote();
    expect(image.rehydrateCurrentRoot("selected")).toEqual(candidate.selected);
    expect(image.rehydrateCurrentRoot("sibling")).toEqual(candidate.sibling);
    expect(() => image.rehydrateCurrentRoot("missing" as "selected")).toThrow("root missing is unavailable");
  });

  it("rejects named root reads from a non-record authority", () => {
    const image = new TransactionalTypedStateImageV1(
      createTransactionalTypedStateManifestV1("test-non-record-root-reader", 1, 8, 64),
      1,
    );
    expect(image.rehydrateCurrent()).toBe(1);
    expect(() => image.rehydrateCurrentRoot("toFixed")).toThrow("root is not a record");
  });

  it("keeps declared frozen configuration roots outside hot images", () => {
    type State = Readonly<{
      value: number;
      configuration: Readonly<{
        label: string;
        nested: Readonly<{ gain: number }>;
      }>;
    }>;
    const configuration = Object.freeze({
      label: "stable",
      nested: Object.freeze({ gain: 2 }),
    });
    const initial: State = Object.freeze({ value: 1, configuration });
    const manifest = createTransactionalTypedStateManifestV1(
      "test-external-immutable-state",
      initial,
      1,
      1,
      { externalImmutablePointers: ["/configuration"] },
    );
    expect(manifest.numericalLayout).toMatchObject({
      continuousSlots: [{ pointer: "/value" }],
      stringSlots: [],
      externalImmutableRoots: [{ pointer: "/configuration" }],
    });
    const image = new TransactionalTypedStateImageV1(manifest, initial);
    expect(image.rehydrateCurrent()).toEqual(initial);
    expect(image.rehydrateCurrent().configuration).toBe(configuration);
    expect(image.rehydrateCurrentRoot("configuration")).toBe(configuration);
    expect(image.report()).toMatchObject({
      externalImmutableRootCount: 1,
      externalImmutableIdentityMatchCount: 1,
      externalImmutableCanonicalMatchCount: 0,
    });

    image.stage(Object.freeze({ value: 2, configuration }));
    image.promote();
    const equivalentConfiguration = Object.freeze({
      label: "stable",
      nested: Object.freeze({ gain: 2 }),
    });
    image.stage(Object.freeze({
      value: 3,
      configuration: equivalentConfiguration,
    }));
    image.promote();
    expect(image.rehydrateCurrent().configuration).toBe(configuration);
    expect(image.report()).toMatchObject({
      externalImmutableIdentityMatchCount: 2,
      externalImmutableCanonicalMatchCount: 1,
    });
    expect(() => image.stage(Object.freeze({
      value: 4,
      configuration: Object.freeze({
        label: "changed",
        nested: Object.freeze({ gain: 2 }),
      }),
    }))).toThrow("external immutable /configuration changed");
    expect(image.report().staged).toBe(false);
    expect(image.report()).toMatchObject({
      externalImmutableIdentityMatchCount: 2,
      externalImmutableCanonicalMatchCount: 1,
    });

    expect(() => createTransactionalTypedStateManifestV1(
      "test-mutable-external-state",
      { value: 1, configuration: { gain: 2 } },
      1,
      1,
      { externalImmutablePointers: ["/configuration"] },
    )).toThrow("external immutable /configuration must be frozen");
    expect(() => createTransactionalTypedStateManifestV1(
      "test-missing-external-state",
      initial,
      1,
      1,
      { externalImmutablePointers: ["/missing"] },
    )).toThrow("external-immutable /missing is unavailable");

    const scalarInitial: Readonly<{ value: number; mode: string }> =
      Object.freeze({ value: 1, mode: "fixed" });
    const scalarManifest = createTransactionalTypedStateManifestV1(
      "test-external-immutable-scalar",
      scalarInitial,
      1,
      1,
      { externalImmutablePointers: ["/mode"] },
    );
    const scalarImage = new TransactionalTypedStateImageV1(
      scalarManifest,
      scalarInitial,
    );
    expect(scalarManifest.numericalLayout).toMatchObject({
      stringSlots: [],
      externalImmutableRoots: [{ pointer: "/mode" }],
    });
    expect(() => scalarImage.stage(Object.freeze({
      value: 2,
      mode: "changed",
    }))).toThrow("external immutable /mode changed");
  });

  it("promotes model-declared fixed arrays into typed slots", () => {
    const initial = Object.freeze({
      pair: Object.freeze([1, 2] as const),
      queue: Object.freeze([] as readonly number[]),
    });
    const manifest = createTransactionalTypedStateManifestV1(
      "test-fixed-array-state",
      initial,
      8,
      64,
      { fixedArrayPointers: ["/pair"] },
    );
    expect(manifest.numericalLayout).toMatchObject({
      continuousSlots: { length: 2 },
      excludedDynamicRoots: [{ pointer: "/queue" }],
      containers: expect.arrayContaining([
        expect.objectContaining({ pointer: "/pair", kind: "array" }),
      ]),
    });
    const image = new TransactionalTypedStateImageV1(manifest, initial);
    expect(image.rehydrateCurrent()).toEqual(initial);
    expect(() => image.stage(Object.freeze({
      pair: Object.freeze([3] as const),
      queue: Object.freeze([] as readonly number[]),
    }) as unknown as typeof initial)).toThrow("changed array shape");
    expect(() => createTransactionalTypedStateManifestV1(
      "test-missing-fixed-array",
      initial,
      8,
      64,
      { fixedArrayPointers: ["/missing"] },
    )).toThrow("fixed-array /missing is unavailable");

    const emptyStringState = Object.freeze({ value: 0, label: "" });
    const emptyStringImage = new TransactionalTypedStateImageV1(
      createTransactionalTypedStateManifestV1(
        "test-empty-string-state",
        emptyStringState,
        1,
        1,
      ),
      emptyStringState,
    );
    expect(emptyStringImage.currentCursor().readString(0)).toBe("");
  });

  it("stores declared nullable numeric leaves as tagged typed slots", () => {
    type State = Readonly<{ value: number; optionalTimeSec: number | null }>;
    const initial: State = Object.freeze({ value: 1, optionalTimeSec: null });
    const manifest = createTransactionalTypedStateManifestV1(
      "test-nullable-continuous-state",
      initial,
      1,
      1,
      { nullableContinuousPointers: ["/optionalTimeSec"] },
    );
    expect(manifest.numericalLayout).toMatchObject({
      nullableContinuousSlots: [{ pointer: "/optionalTimeSec" }],
      excludedDynamicRoots: [],
    });
    const image = new TransactionalTypedStateImageV1(manifest, initial);
    const cursor = image.currentCursor();
    expect(cursor.readNullableContinuous(0)).toBeNull();
    expect(image.rehydrateCurrent()).toEqual(initial);

    const initiallyPresent: State = Object.freeze({
      value: 4,
      optionalTimeSec: 0.5,
    });
    const initiallyPresentManifest = createTransactionalTypedStateManifestV1(
      "test-nullable-continuous-state",
      initiallyPresent,
      1,
      1,
      { nullableContinuousPointers: ["/optionalTimeSec"] },
    );
    expect(initiallyPresentManifest.numericalLayout)
      .toEqual(manifest.numericalLayout);
    expect(initiallyPresentManifest.fingerprint).toBe(manifest.fingerprint);
    expect(initiallyPresentManifest.bufferByteLength)
      .toBe(manifest.bufferByteLength);
    const initiallyPresentImage = new TransactionalTypedStateImageV1(
      initiallyPresentManifest,
      initiallyPresent,
    );
    expect(initiallyPresentImage.currentCursor().readNullableContinuous(0))
      .toBe(0.5);
    expect(initiallyPresentImage.rehydrateCurrent()).toEqual(initiallyPresent);
    expect(() => createTransactionalTypedStateManifestV1(
      "test-invalid-initial-nullable-continuous-state",
      { value: 4, optionalTimeSec: Number.NaN },
      1,
      1,
      { nullableContinuousPointers: ["/optionalTimeSec"] },
    )).toThrow(/reference must be null or finite/);

    image.stage(Object.freeze({ value: 2, optionalTimeSec: 0.25 }));
    image.promote();
    expect(cursor.readNullableContinuous(0)).toBe(0.25);
    expect(image.rehydrateCurrent()).toEqual({
      value: 2,
      optionalTimeSec: 0.25,
    });

    const direct = image.beginCandidateFromCurrent();
    direct.writeNullableContinuous(0, null);
    expect(direct.readNullableContinuous(0)).toBeNull();
    expect(image.rehydrateStaged()).toEqual({ value: 2, optionalTimeSec: null });
    expect(() => direct.writeNullableContinuous(0, Number.NaN))
      .toThrow("value is invalid");
    image.abort();

    expect(() => image.stage(Object.freeze({
      value: 3,
      optionalTimeSec: "invalid",
    }) as unknown as State)).toThrow("must be null or finite");
    expect(() => createTransactionalTypedStateManifestV1(
      "test-missing-nullable-continuous",
      initial,
      1,
      1,
      { nullableContinuousPointers: ["/missing"] },
    )).toThrow("nullable-continuous /missing is unavailable");
  });

  it("stores declared nullable strings without canonical dynamic payloads", () => {
    type State = Readonly<{ value: number; optionalId: string | null }>;
    const initial: State = Object.freeze({ value: 1, optionalId: null });
    const manifest = createTransactionalTypedStateManifestV1(
      "test-nullable-string-state",
      initial,
      32,
      1,
      { nullableStringPointers: ["/optionalId"] },
    );
    expect(manifest.numericalLayout).toMatchObject({
      nullableStringSlots: [{ pointer: "/optionalId" }],
      excludedDynamicRoots: [],
    });
    const image = new TransactionalTypedStateImageV1(manifest, initial);
    const cursor = image.currentCursor();
    expect(cursor.readNullableString(0)).toBeNull();
    expect(image.rehydrateCurrent()).toEqual(initial);

    const initiallyPresent: State = Object.freeze({
      value: 5,
      optionalId: "capture:initial",
    });
    const initiallyPresentManifest = createTransactionalTypedStateManifestV1(
      "test-nullable-string-state",
      initiallyPresent,
      32,
      1,
      { nullableStringPointers: ["/optionalId"] },
    );
    expect(initiallyPresentManifest.numericalLayout)
      .toEqual(manifest.numericalLayout);
    expect(initiallyPresentManifest.fingerprint).toBe(manifest.fingerprint);
    expect(initiallyPresentManifest.bufferByteLength)
      .toBe(manifest.bufferByteLength);
    const initiallyPresentImage = new TransactionalTypedStateImageV1(
      initiallyPresentManifest,
      initiallyPresent,
    );
    expect(initiallyPresentImage.currentCursor().readNullableString(0))
      .toBe("capture:initial");
    expect(initiallyPresentImage.rehydrateCurrent()).toEqual(initiallyPresent);
    expect(() => createTransactionalTypedStateManifestV1(
      "test-invalid-initial-nullable-string-state",
      { value: 5, optionalId: 1 },
      32,
      1,
      { nullableStringPointers: ["/optionalId"] },
    )).toThrow(/reference must be null or a string/);

    image.stage(Object.freeze({ value: 2, optionalId: "capture:1" }));
    image.promote();
    expect(cursor.readNullableString(0)).toBe("capture:1");
    expect(image.rehydrateCurrent()).toEqual({
      value: 2,
      optionalId: "capture:1",
    });

    image.stage(Object.freeze({ value: 3, optionalId: "" }));
    image.promote();
    expect(cursor.readNullableString(0)).toBe("");
    expect(image.rehydrateCurrent()).toEqual({ value: 3, optionalId: "" });

    image.stage(Object.freeze({ value: 4, optionalId: null }));
    image.promote();
    expect(cursor.readNullableString(0)).toBeNull();
    expect(() => image.stage(Object.freeze({
      value: 5,
      optionalId: 1,
    }) as unknown as State)).toThrow("must be null or a string");
    expect(() => createTransactionalTypedStateManifestV1(
      "test-missing-nullable-string",
      initial,
      32,
      1,
      { nullableStringPointers: ["/missing"] },
    )).toThrow("nullable-string /missing is unavailable");
  });

  it("stores declared nullable fixed-shape records behind one presence tag", () => {
    type OptionalRecord = Readonly<{
      label: string;
      gain: number;
      enabled: boolean;
      sourceId: string | null;
      nested: Readonly<{ count: number }>;
      pair: readonly [number, number];
    }>;
    type State = Readonly<{
      value: number;
      optional: OptionalRecord | null;
    }>;
    const template: OptionalRecord = Object.freeze({
      label: "template",
      gain: 0,
      enabled: false,
      sourceId: null,
      nested: Object.freeze({ count: 0 }),
      pair: Object.freeze([0, 0] as const),
    });
    const initial: State = Object.freeze({ value: 1, optional: null });
    const manifest = createTransactionalTypedStateManifestV1(
      "test-optional-record-state",
      initial,
      128,
      1,
      {
        fixedArrayPointers: ["/optional/pair"],
        nullableStringPointers: ["/optional/sourceId"],
        optionalRecordTemplates: [{ pointer: "/optional", template }],
      },
    );
    expect(manifest.numericalLayout).toMatchObject({
      optionalRecordRoots: [{ pointer: "/optional" }],
      nullableStringSlots: [{ pointer: "/optional/sourceId" }],
      excludedDynamicRoots: [],
    });
    const image = new TransactionalTypedStateImageV1(manifest, initial);
    expect(image.report()).toMatchObject({
      optionalRecordRootCount: 1,
      dynamicRootCount: 0,
    });
    expect(image.snapshot().optionalRecordPresent).toEqual(new Uint8Array([0]));
    expect(image.rehydrateCurrent()).toEqual(initial);

    const present: State = Object.freeze({
      value: 2,
      optional: Object.freeze({
        label: "accepted",
        gain: 1.25,
        enabled: true,
        sourceId: "source:1",
        nested: Object.freeze({ count: 3 }),
        pair: Object.freeze([4, 5] as const),
      }),
    });
    image.stage(present);
    image.promote();
    expect(image.snapshot().optionalRecordPresent).toEqual(new Uint8Array([1]));
    expect(image.rehydrateCurrent()).toEqual(present);

    image.stage(Object.freeze({ value: 3, optional: null }));
    image.promote();
    expect(image.rehydrateCurrent()).toEqual({ value: 3, optional: null });
    expect(() => image.stage(Object.freeze({
      value: 4,
      optional: Object.freeze({
        ...present.optional!,
        unexpected: true,
      }),
    }) as unknown as State)).toThrow("changed record shape");
    expect(() => createTransactionalTypedStateManifestV1(
      "test-mutable-optional-record-template",
      initial,
      128,
      1,
      {
        optionalRecordTemplates: [{
          pointer: "/optional",
          template: { label: "mutable" },
        }],
      },
    )).toThrow("optional-record template must be frozen");
    expect(() => createTransactionalTypedStateManifestV1(
      "test-missing-optional-record",
      initial,
      128,
      1,
      {
        optionalRecordTemplates: [{
          pointer: "/missing",
          template: Object.freeze({ value: 0 }),
        }],
      },
    )).toThrow("optional-record /missing is unavailable");
  });

  it("stores bounded queues as one length plus fixed typed item slots", () => {
    type QueueItem = Readonly<{
      id: string;
      at: number;
      enabled: boolean;
      parentId: string | null;
      nested: Readonly<{ gain: number }>;
    }>;
    type State = Readonly<{
      value: number;
      queue: readonly QueueItem[];
    }>;
    const itemTemplate: QueueItem = Object.freeze({
      id: "template",
      at: 0,
      enabled: false,
      parentId: null,
      nested: Object.freeze({ gain: 0 }),
    });
    const initial: State = Object.freeze({ value: 1, queue: Object.freeze([]) });
    const manifest = createTransactionalTypedStateManifestV1(
      "test-bounded-array-state",
      initial,
      256,
      1,
      {
        nullableStringPointers: [
          "/queue/0/parentId",
          "/queue/1/parentId",
        ],
        boundedArrayTemplates: [{
          pointer: "/queue",
          capacity: 2,
          itemTemplate,
        }],
      },
    );
    expect(manifest.numericalLayout).toMatchObject({
      boundedArrayRoots: [{ pointer: "/queue", capacity: 2 }],
      nullableStringSlots: [
        { pointer: "/queue/0/parentId" },
        { pointer: "/queue/1/parentId" },
      ],
      excludedDynamicRoots: [],
    });
    const image = new TransactionalTypedStateImageV1(manifest, initial);
    const cursor = image.currentCursor();
    expect(image.report()).toMatchObject({
      boundedArrayRootCount: 1,
      dynamicRootCount: 0,
    });
    expect(image.snapshot().boundedArrayLengths).toEqual(new Uint32Array([0]));
    expect(cursor.readBoundedArray(0)).toEqual([]);

    const one: State = Object.freeze({
      value: 2,
      queue: Object.freeze([Object.freeze({
        id: "first",
        at: 0.25,
        enabled: true,
        parentId: null,
        nested: Object.freeze({ gain: 1.5 }),
      })]),
    });
    image.stage(one);
    image.promote();
    expect(image.snapshot().boundedArrayLengths).toEqual(new Uint32Array([1]));
    expect(cursor.readBoundedArray(0)).toEqual(one.queue);
    expect(image.rehydrateCurrent()).toEqual(one);

    const two: State = Object.freeze({
      value: 3,
      queue: Object.freeze([
        one.queue[0]!,
        Object.freeze({
          id: "second",
          at: 0.5,
          enabled: false,
          parentId: "first",
          nested: Object.freeze({ gain: 2 }),
        }),
      ]),
    });
    image.stage(two);
    image.promote();
    expect(cursor.readBoundedArray(0)).toEqual(two.queue);
    expect(image.report().boundedArrays).toEqual([{
      pointer: "/queue",
      capacity: 2,
      currentLength: 2,
      highWaterLength: 2,
    }]);
    const escaped = image.snapshot();
    escaped.boundedArrayLengths[0] = 0;
    expect(image.rehydrateCurrent()).toEqual(two);

    image.stage(Object.freeze({ value: 4, queue: Object.freeze([]) }));
    image.promote();
    expect(cursor.readBoundedArray(0)).toEqual([]);
    expect(image.report().boundedArrays[0]).toMatchObject({
      currentLength: 0,
      highWaterLength: 2,
    });
    expect(() => image.stage(Object.freeze({
      value: 5,
      queue: Object.freeze([two.queue[0]!, two.queue[1]!, two.queue[0]!]),
    }))).toThrow("exceeds bounded-array capacity");

    const sparse = new Array<QueueItem>(1);
    Object.freeze(sparse);
    expect(() => image.stage(Object.freeze({ value: 5, queue: sparse })))
      .toThrow("changed bounded-array shape");
    expect(() => image.stage(Object.freeze({
      value: 5,
      queue: Object.freeze([Object.freeze({
        ...one.queue[0]!,
        unexpected: true,
      })]),
    }) as unknown as State)).toThrow("changed record shape");
    expect(() => createTransactionalTypedStateManifestV1(
      "test-mutable-bounded-array-template",
      initial,
      256,
      1,
      {
        boundedArrayTemplates: [{
          pointer: "/queue",
          capacity: 2,
          itemTemplate: { id: "mutable" },
        }],
      },
    )).toThrow("bounded-array item template must be frozen");
  });

  it("rebinds optional owner configuration from an immutable source", () => {
    type Configuration = Readonly<{
      configurationId: string;
      events: readonly Readonly<{ at: number }>[];
    }>;
    type Owner = Readonly<{
      configuration: Configuration;
      cursor: number;
    }>;
    type State = Readonly<{
      value: number;
      configuration: Configuration;
      owner: Owner | null;
    }>;
    const configuration: Configuration = Object.freeze({
      configurationId: "configuration-a",
      events: Object.freeze([Object.freeze({ at: 0.25 })]),
    });
    const ownerTemplate = Object.freeze({
      configuration: null,
      cursor: 0,
    });
    const options = {
      externalImmutablePointers: ["/configuration"],
      externalImmutableAliases: [{
        pointer: "/owner/configuration",
        sourcePointer: "/configuration",
      }],
      optionalRecordTemplates: [{
        pointer: "/owner",
        template: ownerTemplate,
      }],
    } as const;
    const absent: State = Object.freeze({
      value: 1,
      configuration,
      owner: null,
    });
    const present: State = Object.freeze({
      value: 2,
      configuration,
      owner: Object.freeze({ configuration, cursor: 1 }),
    });
    const absentManifest = createTransactionalTypedStateManifestV1(
      "test-optional-external-alias",
      absent,
      128,
      0,
      options,
    );
    const presentManifest = createTransactionalTypedStateManifestV1(
      "test-optional-external-alias",
      present,
      128,
      0,
      options,
    );
    expect(presentManifest.fingerprint).toBe(absentManifest.fingerprint);
    expect(absentManifest.numericalLayout.externalImmutableAliases).toEqual([{
      pointer: "/owner/configuration",
      sourcePointer: "/configuration",
      sourcePath: ["configuration"],
    }]);

    const image = new TransactionalTypedStateImageV1(absentManifest, absent);
    image.stage(present);
    image.promote();
    const restored = image.rehydrateCurrent();
    expect(restored).toEqual(present);
    expect(restored.configuration).toBe(configuration);
    expect(restored.owner?.configuration).toBe(configuration);

    const wrongConfiguration: Configuration = Object.freeze({
      configurationId: "configuration-b",
      events: Object.freeze([Object.freeze({ at: 0.25 })]),
    });
    expect(() => image.stage(Object.freeze({
      value: 3,
      configuration,
      owner: Object.freeze({
        configuration: wrongConfiguration,
        cursor: 1,
      }),
    }))).toThrow(
      "external immutable /owner/configuration changed",
    );
    expect(() => createTransactionalTypedStateManifestV1(
      "test-unadmitted-external-alias",
      absent,
      128,
      0,
      {
        externalImmutableAliases: [{
          pointer: "/owner/configuration",
          sourcePointer: "/configuration",
        }],
        optionalRecordTemplates: options.optionalRecordTemplates,
      },
    )).toThrow("alias source /configuration is not admitted");
    expect(() => createTransactionalTypedStateManifestV1(
      "test-zero-dynamic-arena-with-root",
      Object.freeze({ value: 0, dynamic: null }),
      128,
      0,
    )).toThrow("dynamic roots require a positive arena capacity");
  });

  it("round-trips all leaf classes and keeps failed candidates inactive", () => {
    type State = Readonly<{
      value: number;
      enabled: boolean;
      label: string;
      fixed: Readonly<{ samples: Float64Array }>;
      optional: Readonly<{ count: number }> | null;
      queue: readonly Readonly<{ id: string; at: number }>[];
    }>;
    const initial: State = Object.freeze({
      value: 1,
      enabled: false,
      label: "initial",
      fixed: Object.freeze({ samples: new Float64Array([2, 3]) }),
      optional: null,
      queue: Object.freeze([]),
    });
    const manifest = createTransactionalTypedStateManifestV1(
      "test-typed-state",
      initial,
      32,
      128,
    );
    const image = new TransactionalTypedStateImageV1(manifest, initial);
    const cursor = image.currentCursor();
    const valueSlot = manifest.numericalLayout.continuousSlots.findIndex(
      ({ pointer }) => pointer === "/value",
    );
    const labelSlot = manifest.numericalLayout.stringSlots.findIndex(
      ({ pointer }) => pointer === "/label",
    );
    const optionalSlot = manifest.numericalLayout.excludedDynamicRoots.findIndex(
      ({ pointer }) => pointer === "/optional",
    );
    const queueSlot = manifest.numericalLayout.excludedDynamicRoots.findIndex(
      ({ pointer }) => pointer === "/queue",
    );
    expect(cursor.readContinuous(valueSlot)).toBe(1);
    expect(cursor.readBoolean(0)).toBe(false);
    expect(cursor.readString(labelSlot)).toBe("initial");
    expect(cursor.readDynamic(optionalSlot)).toBeNull();
    expect(cursor.readDynamic(queueSlot)).toEqual([]);
    expect(image.rehydrateCurrent()).toEqual(initial);
    expect(image.report()).toMatchObject({
      continuousSlotCount: 3,
      booleanSlotCount: 1,
      stringSlotCount: 1,
      dynamicRootCount: 2,
      fixedImageCount: 2,
      commitCount: 0,
      staged: false,
    });

    const candidate: State = Object.freeze({
      value: 4,
      enabled: true,
      label: "next",
      fixed: Object.freeze({ samples: new Float64Array([5, 6]) }),
      optional: Object.freeze({ count: 7 }),
      queue: Object.freeze([Object.freeze({ id: "impulse-1", at: 0.25 })]),
    });
    image.stage(candidate);
    expect(cursor.readContinuous(valueSlot)).toBe(1);
    expect(cursor.readString(labelSlot)).toBe("initial");
    expect(image.rehydrateCurrent()).toEqual(initial);
    expect(image.rehydrateStaged()).toEqual(candidate);
    image.promote();
    expect(image.currentCursor()).toBe(cursor);
    expect(cursor.readContinuous(valueSlot)).toBe(4);
    expect(cursor.readBoolean(0)).toBe(true);
    expect(cursor.readString(labelSlot)).toBe("next");
    const escapedOptional = cursor.readDynamic(optionalSlot) as { count: number };
    expect(escapedOptional).toEqual({ count: 7 });
    expect(() => cursor.readContinuous(-1)).toThrow("slot index is invalid");
    expect(image.rehydrateCurrent()).toEqual(candidate);
    expect(image.report()).toMatchObject({ commitCount: 1, staged: false });

    const directCandidate = image.beginCandidateFromCurrent();
    expect(directCandidate.readContinuous(valueSlot)).toBe(4);
    directCandidate.writeContinuous(valueSlot, 8);
    directCandidate.writeBoolean(0, false);
    expect(image.rehydrateCurrent()).toEqual(candidate);
    expect(image.rehydrateStaged()).toEqual({
      ...candidate,
      value: 8,
      enabled: false,
    });
    expect(() => directCandidate.writeContinuous(valueSlot, Number.NaN))
      .toThrow("must be finite");
    image.abort();
    expect(() => directCandidate.readContinuous(valueSlot)).toThrow("is stale");
    expect(image.rehydrateCurrent()).toEqual(candidate);

    const requiredWritePlan = image.createPromotionPlan({
      continuous: [valueSlot],
      booleans: [0],
      strings: [labelSlot],
    });
    const incompleteModelOwned = image.beginCandidateFromCurrent();
    incompleteModelOwned.writeContinuous(valueSlot, 10);
    incompleteModelOwned.writeBoolean(0, true);
    expect(() => image.tryPromoteCandidateWithRequiredWrites(
      { ...candidate, value: 10 },
      requiredWritePlan,
    )).toThrow("required string slot");
    image.abort();
    expect(image.rehydrateCurrent()).toEqual(candidate);

    const completeModelOwned = image.beginCandidateFromCurrent();
    completeModelOwned.writeContinuous(valueSlot, 10);
    completeModelOwned.writeBoolean(0, true);
    completeModelOwned.writeStringSameByteLength(labelSlot, "next");
    expect(image.tryPromoteCandidateWithRequiredWrites(
      { ...candidate, value: 10 },
      requiredWritePlan,
    )).toEqual({ ...candidate, value: 10 });
    expect(image.rehydrateCurrent()).toEqual({ ...candidate, value: 10 });
    expect(image.report().modelOwnedPromotionCount).toBe(1);

    const adapterFreeModelOwned = image.beginCandidateFromCurrent();
    adapterFreeModelOwned.writeContinuous(valueSlot, 12);
    adapterFreeModelOwned.writeBoolean(0, true);
    adapterFreeModelOwned.writeStringSameByteLength(labelSlot, "next");
    image.promoteCandidateWithRequiredWrites(requiredWritePlan);
    expect(image.rehydrateCurrent()).toEqual({
      ...candidate,
      value: 12,
    });
    expect(image.report().modelOwnedPromotionCount).toBe(2);

    const forgedPlan = { ...requiredWritePlan };
    const forgedCandidate = image.beginCandidateFromCurrent();
    forgedCandidate.writeContinuous(valueSlot, 11);
    forgedCandidate.writeBoolean(0, true);
    forgedCandidate.writeStringSameByteLength(labelSlot, "next");
    expect(() => image.tryPromoteCandidateWithRequiredWrites(
      { ...candidate, value: 11 },
      forgedPlan,
    )).toThrow("promotion plan has the wrong layout");
    image.abort();
    expect(image.rehydrateCurrent()).toEqual({
      ...candidate,
      value: 12,
    });

    expect(() => image.createCompletionPlan({
      continuous: [valueSlot, valueSlot],
    })).toThrow("retained slot is duplicated");

    const mismatchedCandidate = image.beginCandidateFromCurrent();
    mismatchedCandidate.writeContinuous(valueSlot, 9);
    const valueOnlyCompletionPlan = image.createCompletionPlan({
      continuous: [valueSlot],
    });
    expect(() => image.completeCandidateFromObject(
      { ...candidate, value: 10 },
      valueOnlyCompletionPlan,
    )).toThrow("differs from adapter");
    image.abort();
    expect(image.rehydrateCurrent()).toEqual({ ...candidate, value: 12 });

    const promotedCandidate = image.beginCandidateFromCurrent();
    promotedCandidate.writeContinuous(valueSlot, 9);
    const promotedCompletionPlan = image.createCompletionPlan({
      continuous: [valueSlot],
      booleans: [0],
    });
    image.completeCandidateFromObject(
      { ...candidate, value: 9 },
      promotedCompletionPlan,
    );
    image.promote();
    expect(() => promotedCandidate.writeContinuous(valueSlot, 10))
      .toThrow("is stale");
    expect(cursor.readContinuous(valueSlot)).toBe(9);
    expect(image.rehydrateCurrent()).toEqual({ ...candidate, value: 9 });

    const escaped = image.snapshot();
    escaped.continuous[0] = 99;
    escaped.stringBytes[0] = 0;
    expect(image.rehydrateCurrent()).toEqual({ ...candidate, value: 9 });

    expect(() => image.stage(Object.freeze({
      ...candidate,
      unexpected: 1,
    }) as State)).toThrow("changed record shape");
    expect(image.rehydrateCurrent()).toEqual({ ...candidate, value: 9 });
    expect(image.report().staged).toBe(false);

    const extendedSamples = new Float64Array([5, 6]);
    Object.defineProperty(extendedSamples, "unexpected", {
      enumerable: true,
      value: 1,
    });
    expect(() => image.stage(Object.freeze({
      ...candidate,
      fixed: Object.freeze({ samples: extendedSamples }),
    }))).toThrow("changed typed-array shape");
    expect(image.rehydrateCurrent()).toEqual({ ...candidate, value: 9 });

    const alternatePrototype = Object.create(null) as { constructor: ObjectConstructor };
    alternatePrototype.constructor = Object;
    const foreignFixed = Object.create(alternatePrototype) as {
      samples: Float64Array;
    };
    foreignFixed.samples = new Float64Array([5, 6]);
    Object.freeze(foreignFixed);
    expect(() => image.stage(Object.freeze({
      ...candidate,
      fixed: foreignFixed,
    }))).toThrow("changed record prototype");
    expect(image.rehydrateCurrent()).toEqual({ ...candidate, value: 9 });

    expect(() => image.stage(Object.freeze({
      ...candidate,
      label: "bad\ud800",
    }))).toThrow("unpaired surrogate");
    expect(image.rehydrateCurrent()).toEqual({ ...candidate, value: 9 });
    expect(image.report().staged).toBe(false);

    expect(() => image.stage(Object.freeze({
      ...candidate,
      queue: Object.freeze(Array.from({ length: 20 }, (_, index) =>
        Object.freeze({ id: `impulse-${index}`, at: index / 10 }))),
    }))).toThrow("dynamic arena capacity exceeded");
    expect(image.rehydrateCurrent()).toEqual({ ...candidate, value: 9 });
    expect(image.report()).toMatchObject({ commitCount: 4, staged: false });
    expect(image.report().directCompletionReaderPlanUseCount).toBe(0);
    expect(image.report().directExactCandidateMatchCount).toBe(0);
  });
});

describe("MainWireIntegratedTypedAuthoritySessionV1", () => {
  it("poisons the current typed authority without promoting an invalid candidate", async () => {
    const oracle = await MainWireIntegratedModelSessionV3.create();
    const initial = oracle.currentAcceptedState();
    const authority = new MainWireAcceptedTypedStateAuthorityV1(
      initial,
      initial,
      (candidate: typeof initial) => candidate,
      (candidate: typeof initial) => candidate,
      (candidate: typeof initial) => candidate,
    );
    const before = authority.report();
    const invalidCandidate = Object.freeze({
      ...initial,
      acceptedTimeSec: Number.NaN,
    });

    expect(() => authority.commit(invalidCandidate))
      .toThrow("accepted typed-state authority is poisoned");
    expect(authority.report()).toMatchObject({
      activeBufferIndex: before.activeBufferIndex,
      commitCount: before.commitCount,
      poisonedReason: expect.stringContaining("must be finite"),
    });
    expect(() => authority.current())
      .toThrow("accepted typed-state authority is poisoned");
  });

  it("promotes a covered typed candidate and rehydrates its mirror lazily", async () => {
    const oracle = await MainWireIntegratedModelSessionV3.create();
    const initial = oracle.currentAcceptedState();
    const authority = new MainWireAcceptedTypedStateAuthorityV1(
      initial,
      initial,
      (candidate: typeof initial) => candidate,
      (candidate: typeof initial) => candidate,
      (candidate: typeof initial) => candidate,
    );
    const timeSlot = authority.manifest().numericalLayout.continuousSlots
      .findIndex(({ pointer }) => pointer === "/acceptedTimeSec");
    if (timeSlot < 0) throw new Error("accepted time slot is unavailable");
    const plan = authority.createModelOwnedPromotionPlan({
      continuous: [timeSlot],
    });
    const previousMirror = authority.current();
    const candidate = authority.beginDirectCandidate();
    candidate.writeContinuous(timeSlot, 0.125);
    authority.commitModelOwnedTypedCandidate(plan);

    expect(authority.currentCursor().readContinuous(timeSlot)).toBe(0.125);
    expect(authority.report()).toMatchObject({
      commitCount: 1,
      directCandidateCommitCount: 1,
      directCandidateMirrorReuseCount: 0,
      modelOwnedCandidateCommitCount: 1,
      modelOwnedAdapterFreeCommitCount: 1,
      lazyMirrorRehydrateCount: 0,
      currentMirrorMatchesImage: false,
    });
    const rehydrated = authority.current();
    expect(rehydrated).not.toBe(previousMirror);
    expect(rehydrated.acceptedTimeSec).toBe(0.125);
    expect(authority.current()).toBe(rehydrated);
    expect(authority.report()).toMatchObject({
      lazyMirrorRehydrateCount: 1,
      currentMirrorMatchesImage: true,
    });
  });

  it("binds the complete coupled hemodynamic view to the full typed authority", async () => {
    const oracle = await MainWireIntegratedModelSessionV3.create();
    const initial = oracle.currentAcceptedState();
    const manifest = createMainWireAcceptedTypedStateManifestV1(initial);
    const image = new TransactionalTypedStateImageV1(manifest, initial);
    const cursor = image.currentCursor();
    const binding = createMainWireAcceptedTypedHemodynamicBindingV1(manifest);
    const actual = createMainWireAcceptedTypedHemodynamicDestinationV1();
    readMainWireAcceptedTypedHemodynamicIntoV1(cursor, binding, actual);

    const reference = new MainWireFlatCoupledAcceptedStateV1(
      mainWireFiveWallCoronaryBaseStateV2(initial.coronary),
    ).snapshot();
    const initialBase = mainWireFiveWallCoronaryBaseStateV2(initial.coronary);
    const initialAdapter =
      materializeMainWireAcceptedTypedCoupledSolverAdapterV1(
        cursor,
        binding,
        initialBase,
        actual,
      );
    expect(initialAdapter).toEqual(initialBase);
    const layout = MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_LAYOUT_V1;
    expect(actual[layout.acceptedTime]).toBe(reference.acceptedTimeSec);
    expect(actual[layout.revision]).toBe(reference.revision);
    expect(actual[layout.fixedTotalBloodVolume]).toBe(
      reference.fixedGlobalTotalBloodVolumeMl,
    );
    expect(actual.slice(
      layout.nonCoronaryVolumes,
      layout.dynamicEdgeFlows,
    )).toEqual(reference.nonCoronaryNodeVolumesMl);
    expect(actual.slice(layout.dynamicEdgeFlows, layout.valveOpenings))
      .toEqual(reference.dynamicEdgeFlowsMlPerSec);
    expect(actual.slice(layout.valveOpenings, layout.coronaryVolumes))
      .toEqual(reference.valveOpeningFractions01);
    expect(actual.slice(layout.coronaryVolumes, layout.coronaryTone))
      .toEqual(reference.coronaryConservedVolumesMl);
    let toneIndex = layout.coronaryTone;
    for (const territoryId of CORONARY_TERRITORY_IDS_V2) {
      for (const layerId of CORONARY_LAYER_IDS_V2) {
        expect(actual[toneIndex]).toBe(
          reference.coronaryToneResistanceScaleByTerritoryLayer[territoryId][
            layerId
          ],
        );
        toneIndex += 1;
      }
    }
    let wallIndex = layout.wallState;
    for (const wallId of MAIN_WIRE_FIVE_WALL_IDS_V1) {
      const wall = reference.mechanicsMaterialState.wallStateByWall[wallId];
      expect(actual.slice(wallIndex, wallIndex + layout.landStateLength))
        .toEqual(wall.landState);
      wallIndex += layout.landStateLength;
      expect(actual[wallIndex++]).toBe(wall.slsState.viscousLogStrain);
      expect(actual[wallIndex++]).toBe(wall.previousFiberLogStrain);
      expect(actual[wallIndex++]).toBe(wall.previousFreeCalciumUM);
    }
    expect(actual[layout.triSeg]).toBe(
      reference.mechanicsMaterialState.trisegCoordinates
        .septalMidwallCapVolumeM3,
    );
    expect(actual[layout.triSeg + 1]).toBe(
      reference.mechanicsMaterialState.trisegCoordinates.junctionRadiusM,
    );
    expect(Array.from(actual.slice(layout.mvc, layout.mvc + 7))).toEqual([
      reference.mvcReferenceState.reference.referenceFiberLogStrainByWall.LVFW,
      reference.mvcReferenceState.reference.referenceFiberLogStrainByWall.SEP,
      reference.mvcReferenceState.reference.referenceFiberLogStrainByWall.RVFW,
      reference.mvcReferenceState.referenceAcceptedTimeSec,
      reference.mvcReferenceState.referenceRevision,
      reference.mvcReferenceState.mitralForwardFlowActive ? 1 : 0,
      reference.mvcReferenceState.acceptedMitralClosureEventCount,
    ]);

    const target = mainWireIntegratedModelPresentationTargetTimeSecV3(1);
    expect(oracle.advanceToPresentationTime(target).status).toBe("advanced");
    const advanced = oracle.currentAcceptedState();
    image.stage(advanced);
    image.promote();
    readMainWireAcceptedTypedHemodynamicIntoV1(cursor, binding, actual);
    const advancedAdapter =
      materializeMainWireAcceptedTypedCoupledSolverAdapterV1(
        cursor,
        binding,
        initialBase,
        actual,
      );
    expect(advancedAdapter).toEqual(
      mainWireFiveWallCoronaryBaseStateV2(advanced.coronary),
    );
    expect(actual[layout.acceptedTime]).toBe(advanced.acceptedTimeSec);
    expect(actual[layout.revision]).toBe(advanced.revision);
    expect(actual[layout.acceptedTime]).toBeGreaterThan(initial.acceptedTimeSec);
    actual.fill(Number.NaN);
    expect(advancedAdapter.mechanics.materialState.wallStateByWall.LVFW
      .landState.every(Number.isFinite)).toBe(true);
  });

  it("binds compiled state identities to exact typed-authority slots once", async () => {
    const oracle = await MainWireIntegratedModelSessionV3.create();
    const initial = oracle.currentAcceptedState();
    const manifest = createMainWireAcceptedTypedStateManifestV1(initial);
    const image = new TransactionalTypedStateImageV1(manifest, initial);
    const descriptor = compileExecutionPlanV1(
      createMainWireModelDefinitionV1(),
      createMainWireNumericalPolicyV1(),
    );
    const boundPlan = bindExecutionPlanV1(
      descriptor,
      kernelCatalogFromDescriptor(descriptor),
    );
    const binding = bindExecutionPlanAcceptedTypedStateV1(
      boundPlan,
      manifest,
    );
    const compiled = new Float64Array(descriptor.stateLayout.logicalSlotCount);
    readExecutionPlanAcceptedTypedStateIntoLogicalV1(
      binding,
      image.currentCursor(),
      compiled,
    );
    const manualBinding = createMainWireAcceptedTypedHemodynamicBindingV1(
      manifest,
    );
    const compiledHemodynamicBinding =
      createMainWireAcceptedTypedHemodynamicBindingV1(manifest, binding);
    const manual = createMainWireAcceptedTypedHemodynamicDestinationV1();
    readMainWireAcceptedTypedHemodynamicIntoV1(
      image.currentCursor(),
      manualBinding,
      manual,
    );

    expect(compiled).toEqual(manual);
    expect(compiledHemodynamicBinding).toEqual(manualBinding);
    expect(resolveExecutionPlanAcceptedTypedStateSlotV1(
      binding,
      "mechanics.mvc.mitralForwardFlowActive",
    )).toMatchObject({
      logicalIndex: MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_LAYOUT_V1.mvcActive,
      storageKind: "boolean-u8",
    });
    expect(() => readExecutionPlanAcceptedTypedStateIntoLogicalV1(
      { ...binding },
      image.currentCursor(),
      compiled,
    )).toThrow(/requires an admitted binding/);
    const wrongPointer = structuredClone(descriptor) as unknown as {
      stateLayout: { slots: Array<{ authorityPointer: string }> };
    };
    const firstPointer = wrongPointer.stateLayout.slots[0]!.authorityPointer;
    const booleanIndex =
      MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_LAYOUT_V1.mvcActive;
    wrongPointer.stateLayout.slots[0]!.authorityPointer =
      wrongPointer.stateLayout.slots[booleanIndex]!.authorityPointer;
    wrongPointer.stateLayout.slots[booleanIndex]!.authorityPointer =
      firstPointer;
    const wrongBoundPlan = bindExecutionPlanV1(
      wrongPointer,
      kernelCatalogFromDescriptor(
        wrongPointer as unknown as ExecutionPlanDescriptorV1,
      ),
    );
    expect(() => bindExecutionPlanAcceptedTypedStateV1(
      wrongBoundPlan,
      manifest,
    )).toThrow(/storage kind drifted/);
  });

  it("stages the coupled partition into the global inactive image without aliases", async () => {
    const oracle = await MainWireIntegratedModelSessionV3.create();
    const initial = oracle.currentAcceptedState();
    const manifest = createMainWireAcceptedTypedStateManifestV1(initial);
    const image = new TransactionalTypedStateImageV1(manifest, initial);
    const binding = createMainWireAcceptedTypedHemodynamicBindingV1(manifest);
    const candidateCursor = image.beginCandidateFromCurrent();
    const scratch = createMainWireAcceptedTypedHemodynamicDestinationV1();
    const coronary = initial.coronary;
    const nonCoronaryNodeVolumesMl = new Float64Array(
      NON_CORONARY_NODE_NAMES_V1.map(
        (nodeId) => coronary.circulation.nodeVolumesMl[nodeId],
      ),
    );
    const dynamicEdgeFlowsMlPerSec = new Float64Array(
      NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.map(
        (edgeId) => coronary.circulation.dynamicEdgeFlowsMlPerSec[edgeId],
      ),
    );
    stageMainWireAcceptedTypedCoupledCandidateV1(
      candidateCursor,
      binding,
      Object.freeze({
        candidateTimeSec: coronary.acceptedTimeSec,
        candidateRevision: coronary.revision,
        stepDtSec: .002,
        assertCurrent() {},
        nonCoronaryNodeAbsolutePressuresMmHg: new Float64Array(15),
        nonCoronaryEdgeFlowsMlPerSec: new Float64Array(15),
        coronarySignedEdgeFlowsMlPerSec: new Float64Array(22),
        fixedGlobalTotalBloodVolumeMl:
          coronary.fixedGlobalTotalBloodVolumeMl,
        nonCoronaryNodeVolumesMl,
        dynamicEdgeFlowsMlPerSec,
        valveStates: Object.freeze(NON_CORONARY_VALVE_NAMES_V1.map(
          (valveId) => Object.freeze({
            leafletOpeningFraction01:
              coronary.circulation.valveStates[valveId]
                .leafletOpeningFraction01,
          }),
        )),
        coronaryVolumesMl: coronary.coronary.volumeMlByNode,
        coronaryToneResistanceScaleByTerritoryLayer:
          coronary.coronary.toneResistanceScaleByTerritoryLayer,
        coronaryAutoregulationHydraulicObservables: new Float64Array(10),
        acceptedNumericalReadback: new Float64Array(32),
        mechanicsCandidateVolumesMl: coronary.mechanics.acceptedVolumesMl,
        mechanicsMaterialState: coronary.mechanics.materialState,
        mechanicsMaterialStateFingerprint:
          coronary.mechanics.materialStateFingerprint,
        mvcReferenceState: coronary.mvcReferenceState,
      }),
      scratch,
    );
    scratch.fill(Number.NaN);
    nonCoronaryNodeVolumesMl.fill(Number.NaN);
    dynamicEdgeFlowsMlPerSec.fill(Number.NaN);
    const staged = image.rehydrateStaged().coronary;
    const {
      totalBloodVolumeMl: stagedTotalBloodVolumeMl,
      ...stagedCirculation
    } = staged.circulation;
    const {
      totalBloodVolumeMl: expectedTotalBloodVolumeMl,
      ...expectedCirculation
    } = coronary.circulation;
    expect({ ...staged, circulation: stagedCirculation }).toEqual({
      ...coronary,
      circulation: expectedCirculation,
    });
    expect(stagedTotalBloodVolumeMl).toBe(
      NON_CORONARY_NODE_NAMES_V1.reduce(
        (sum, nodeId) => sum + coronary.circulation.nodeVolumesMl[nodeId],
        0,
      ),
    );
    expect(Math.abs(
      stagedTotalBloodVolumeMl - expectedTotalBloodVolumeMl,
    )).toBeLessThanOrEqual(
      64 * Number.EPSILON * expectedTotalBloodVolumeMl,
    );
    image.abort();
    expect(image.report().staged).toBe(false);
  });

  it("keeps authored events external while typing both mutable schedules", async () => {
    const oracle = await MainWireIntegratedModelSessionV3.create();
    const accepted = oracle.currentAcceptedState();
    const base = accepted.composedRhythm.configuration;
    const pacingConfiguration =
      createAcceptedAuthoredVentricularPacingReplaySourceConfigurationV1({
        configurationId: "typed-pacing-configuration",
        ownerInstanceId: "typed-pacing-owner",
        replayId: "typed-pacing-replay",
        sourceId: "typed-pacing-source",
        events: [{
          pacingEventId: "typed-pacing-event-1",
          sourceSequence: 1,
          activationTimeSec: 0.125,
        }],
      });
    const ectopyConfiguration =
      createAcceptedAuthoredEctopyScheduleConfigurationV2({
        configurationId: "typed-ectopy-configuration",
        ownerInstanceId: "typed-ectopy-owner",
        scheduleId: "typed-ectopy-schedule",
        events: [{
          eventKind: "pac",
          authoredEctopyId: "typed-ectopy-event-1",
          sourceId: "typed-ectopy-source",
          sourceSequence: 1,
          activationTimeSec: 0.125,
          chamber: "atrial",
          sinusResetPolicy: "reset",
        }],
      });
    const configuration =
      createAcceptedComposedRhythmTransactionConfigurationV2({
        configurationId: base.configurationId,
        ownerInstanceId: base.ownerInstanceId,
        atrialSource: base.atrialSource,
        authoredEctopySchedule: ectopyConfiguration,
        authoredVentricularPacingReplay: pacingConfiguration,
        electricalCaptureOwner: base.electricalCaptureOwner,
        avGateParameters: base.avGateParameters,
        avGateInstanceId: base.avGateInstanceId,
        distalGate: base.distalGate,
        ventricularBackup: base.ventricularBackup,
        ventricularIntervalStrength: base.ventricularIntervalStrength,
        calciumParametersByWall: base.calciumParametersByWall,
        sinusAtrialCalciumDeposit: base.sinusAtrialCalciumDeposit,
        pacAtrialCalciumDeposit: base.pacAtrialCalciumDeposit,
        ventricularCalciumDeposit: base.ventricularCalciumDeposit,
      });
    const pacingState =
      initializeAcceptedAuthoredVentricularPacingReplaySourceStateV1(
        configuration.authoredVentricularPacingReplay!,
        accepted.acceptedTimeSec,
      );
    const ectopyState = initializeAcceptedAuthoredEctopyScheduleStateV2(
      configuration.authoredEctopySchedule,
      accepted.acceptedTimeSec,
    );
    const configuredAccepted = Object.freeze({
      ...accepted,
      composedRhythm: Object.freeze({
        ...accepted.composedRhythm,
        configuration,
        authoredEctopyState: ectopyState,
        authoredVentricularPacingReplayState: pacingState,
      }),
    });
    const manifest = createMainWireAcceptedTypedStateManifestV1(
      configuredAccepted,
    );
    expect(manifest.numericalLayout.excludedDynamicRoots).toEqual([]);
    expect(manifest.numericalLayout.externalImmutableAliases).toEqual([{
      pointer:
        "/composedRhythm/authoredVentricularPacingReplayState/configuration",
      sourcePointer:
        "/composedRhythm/configuration/authoredVentricularPacingReplay",
      sourcePath: [
        "composedRhythm",
        "configuration",
        "authoredVentricularPacingReplay",
      ],
    }]);
    const image = new TransactionalTypedStateImageV1(
      manifest,
      configuredAccepted,
    );
    const restored = image.rehydrateCurrent();
    expect(
      restored.composedRhythm.authoredVentricularPacingReplayState
        ?.configuration,
    ).toBe(
      restored.composedRhythm.configuration.authoredVentricularPacingReplay,
    );
    const binding = createMainWireAcceptedTypedBoundaryBindingV1(manifest);
    expect(limitMainWireAcceptedTypedCandidateTimeV1(
      image.currentCursor(),
      binding,
      0.5,
      configuration,
      null,
    )).toMatchObject({
      candidateTimeSec: 0.125,
      rhythmBoundaryOwners: [
        "authored-ectopy",
        "authored-ventricular-pacing-replay",
      ],
    });
    const candidate = image.beginCandidateFromCurrent();
    stageMainWireAcceptedTypedAuthoredScheduleCandidateV1(
      image.currentCursor(),
      candidate,
      binding,
      0.125,
      configuration,
    );
    const objectCandidate =
      evaluateAcceptedComposedRhythmTransactionCandidateV2(
        configuredAccepted.composedRhythm,
        {
          candidateTimeSec: 0.125,
          externalAtrialSourceBatch: createNoExternalAtrialSourceBatchV2(
            0.125,
          ),
        },
      );
    expect(objectCandidate.pacSinusClockPolicyApplied).toBe("reset");
    stageMainWireAcceptedTypedRegularAtrialCandidateV1(
      image.currentCursor(),
      candidate,
      binding,
      0.125,
      configuration,
      objectCandidate.pacSinusClockPolicyApplied,
    );
    const dynamicMechanicalSupportCandidate = Object.freeze({
      ...configuredAccepted.dynamicMechanicalSupport,
      acceptedFlowMlPerSec: Object.freeze({
        LVAD: 12.5,
        IMPELLA: -1.25,
        VA_ECMO: 33,
        VV_ECMO: 0,
      }),
    });
    stageMainWireAcceptedTypedResolvedCandidateV1(
      image.currentCursor(),
      candidate,
      binding,
      objectCandidate,
      dynamicMechanicalSupportCandidate,
    );
    const stagedState = image.rehydrateStaged();
    const staged = stagedState.composedRhythm;
    expect(staged.authoredEctopyState).toEqual(
      evaluateAcceptedAuthoredEctopyScheduleTrialV2(
        ectopyState,
        0.125,
      ).candidateState,
    );
    expect(staged.authoredVentricularPacingReplayState).toEqual(
      evaluateAcceptedAuthoredVentricularPacingReplaySourceTrialV1(
        pacingState,
        0.125,
      ).candidateState,
    );
    expect(staged.regularAtrialSourceState).toEqual(
      objectCandidate.candidateState.regularAtrialSourceState,
    );
    expect(staged).toMatchObject({
      acceptedAtrialCaptureCount:
        objectCandidate.candidateState.acceptedAtrialCaptureCount,
      acceptedVentricularCaptureCount:
        objectCandidate.candidateState.acceptedVentricularCaptureCount,
      deliveredCalciumDepositCount:
        objectCandidate.candidateState.deliveredCalciumDepositCount,
    });
    expect(stagedState.dynamicMechanicalSupport.acceptedFlowMlPerSec)
      .toEqual(dynamicMechanicalSupportCandidate.acceptedFlowMlPerSec);
    image.abort();
  });

  it("matches every regular atrial source clock policy in fixed slots", async () => {
    const oracle = await MainWireIntegratedModelSessionV3.create();
    const accepted = oracle.currentAcceptedState();
    const regular = accepted.composedRhythm.regularAtrialSourceState;
    expect(regular).not.toBeNull();
    const state = regular!;
    const beforeBoundary = state.acceptedTimeSec
      + (state.nextActivationTimeSec - state.acceptedTimeSec) / 2;
    const cases: readonly Readonly<{
      candidateTimeSec: number;
      policy: CapturedPacSinusClockPolicyV1;
    }>[] = Object.freeze([
      Object.freeze({ candidateTimeSec: beforeBoundary, policy: "preserve" }),
      Object.freeze({ candidateTimeSec: beforeBoundary, policy: "reset" }),
      Object.freeze({
        candidateTimeSec: state.nextActivationTimeSec,
        policy: null,
      }),
    ]);
    for (const entry of cases) {
      const manifest = createMainWireAcceptedTypedStateManifestV1(accepted);
      const image = new TransactionalTypedStateImageV1(manifest, accepted);
      const binding = createMainWireAcceptedTypedBoundaryBindingV1(manifest);
      const candidate = image.beginCandidateFromCurrent();
      stageMainWireAcceptedTypedRegularAtrialCandidateV1(
        image.currentCursor(),
        candidate,
        binding,
        entry.candidateTimeSec,
        accepted.composedRhythm.configuration,
        entry.policy,
      );
      expect(
        image.rehydrateStaged().composedRhythm.regularAtrialSourceState,
      ).toEqual(
        evaluateAcceptedRegularAtrialSourceCandidateV1(
          state,
          entry.candidateTimeSec,
          entry.policy,
        ).candidateState,
      );
      image.abort();
    }
  });

  it("matches the admitted object limiter from direct typed boundary slots", async () => {
    const runtime = await createMainWireIntegratedModelRuntimeV3();
    const oracle = await MainWireIntegratedModelSessionV3.create();
    for (let tick = 1; tick <= 96; tick += 1) {
      const state = oracle.currentAcceptedState();
      const manifest = createMainWireAcceptedTypedStateManifestV1(
        runtime.cold.acceptedState,
      );
      const image = new TransactionalTypedStateImageV1(
        manifest,
        state,
      );
      const cursor = image.currentCursor();
      const binding = createMainWireAcceptedTypedBoundaryBindingV1(manifest);
      expect(readMainWireAcceptedTypedClockV1(cursor, binding)).toEqual({
        acceptedTimeSec: state.acceptedTimeSec,
        revision: state.revision,
      });
      expect(evaluateMainWireAcceptedTypedCalciumDriveV1(
        cursor,
        binding,
        runtime.rhythm.configuration.calciumParametersByWall,
      )).toEqual(
        evaluateMainWireIntegratedModelCalciumDriveV3(state.composedRhythm),
      );
      const target = mainWireIntegratedModelPresentationTargetTimeSecV3(tick);
      const actual = limitMainWireAcceptedTypedCandidateTimeV1(
        cursor,
        binding,
        target,
        runtime.rhythm.configuration,
        null,
      );
      const expected = limitMainWireIntegratedModelCandidateTimeV3(
        state,
        target,
        {
          configuration: runtime.rhythm.configuration,
          externalAfNextBoundaryTimeSec: null,
        },
        runtime.profile,
        runtime.config,
      );
      expect(actual).toEqual(expected);
      const typedCandidate = image.beginCandidateFromCurrent();
      const candidateClock = stageMainWireAcceptedTypedClockCandidateV1(
        cursor,
        typedCandidate,
        binding,
        actual.candidateTimeSec,
      );
      const typedCandidateCalcium = stageMainWireAcceptedTypedCalciumCandidateV1(
        cursor,
        typedCandidate,
        binding,
        actual.candidateTimeSec,
        runtime.rhythm.configuration.calciumParametersByWall,
      );
      const objectCandidate =
        evaluateAcceptedComposedRhythmTransactionCandidateV2(
          state.composedRhythm,
          {
            candidateTimeSec: actual.candidateTimeSec,
            externalAtrialSourceBatch: createNoExternalAtrialSourceBatchV2(
              actual.candidateTimeSec,
            ),
          },
        );
      expect(typedCandidateCalcium).toEqual(
        evaluateMainWireIntegratedModelCalciumDriveV3(
          objectCandidate.candidateState,
        ),
      );
      stageMainWireAcceptedTypedAuthoredScheduleCandidateV1(
        cursor,
        typedCandidate,
        binding,
        actual.candidateTimeSec,
        runtime.rhythm.configuration,
      );
      stageMainWireAcceptedTypedRegularAtrialCandidateV1(
        cursor,
        typedCandidate,
        binding,
        actual.candidateTimeSec,
        runtime.rhythm.configuration,
        objectCandidate.pacSinusClockPolicyApplied,
      );
      expect(
        image.rehydrateStaged().composedRhythm.calciumStateByWall,
      ).toEqual(objectCandidate.candidateState.calciumStateByWall);
      expect(
        image.rehydrateStaged().composedRhythm.authoredEctopyState,
      ).toEqual(objectCandidate.candidateState.authoredEctopyState);
      expect(
        image.rehydrateStaged().composedRhythm.regularAtrialSourceState,
      ).toEqual(objectCandidate.candidateState.regularAtrialSourceState);
      expect(candidateClock).toEqual({
        acceptedTimeSec: objectCandidate.candidateState.acceptedTimeSec,
        revision: objectCandidate.candidateState.revision,
      });
      expect(image.rehydrateStaged()).toMatchObject({
        acceptedTimeSec: candidateClock.acceptedTimeSec,
        revision: candidateClock.revision,
        composedRhythm: {
          acceptedTimeSec: candidateClock.acceptedTimeSec,
          revision: candidateClock.revision,
        },
        coronary: {
          acceptedTimeSec: candidateClock.acceptedTimeSec,
          revision: candidateClock.revision,
        },
      });
      const oracleAdvance = oracle.advanceToPresentationTime(target);
      expect(oracleAdvance.status).toBe("advanced");
      if (oracleAdvance.status !== "advanced") {
        throw new Error("object oracle failed at typed boundary test");
      }
      const oracleStep = oracleAdvance.observation.lastAcceptedStep;
      if (oracleStep === null) {
        throw new Error("object oracle accepted-step readback is absent");
      }
      if (
        objectCandidate.capturedAtrialActivation === null
        && objectCandidate.capturedVentricularActivation === null
        && objectCandidate.deliveredCalciumDeposits.length === 0
        && !oracleStep.coronaryStep.autoregulationWindowCompleted
        && state.coronary.coronaryAutoregulation.windowControl !== null
        && state.coronary.coronaryAutoregulation.windowControl
          === oracleStep.acceptedState.coronary.coronaryAutoregulation
            .windowControl
        && state.coronary.coronaryAutoregulation.desiredControl
          === oracleStep.acceptedState.coronary.coronaryAutoregulation
            .desiredControl
      ) {
        stageMainWireAcceptedTypedOrdinaryPostSolverCandidateV1(
          cursor,
          typedCandidate,
          binding,
          candidateClock,
          oracleStep.acceptedState.coronary.coronaryAutoregulation,
        );
        const staged = image.rehydrateStaged();
        expect(staged.composedRhythm).toMatchObject({
          acceptedAtrialCaptureCount:
            oracleStep.acceptedState.composedRhythm
              .acceptedAtrialCaptureCount,
          acceptedVentricularCaptureCount:
            oracleStep.acceptedState.composedRhythm
              .acceptedVentricularCaptureCount,
          deliveredCalciumDepositCount:
            oracleStep.acceptedState.composedRhythm
              .deliveredCalciumDepositCount,
          electricalCaptureState: {
            acceptedTimeSec: candidateClock.acceptedTimeSec,
          },
          ventricularBackupState: {
            acceptedTimeSec: candidateClock.acceptedTimeSec,
            revision: candidateClock.revision,
          },
        });
        expect(staged.coronary.coronaryAutoregulation).toEqual(
          oracleStep.acceptedState.coronary.coronaryAutoregulation,
        );
        expect(staged.dynamicMechanicalSupport.acceptedFlowMlPerSec).toEqual({
          LVAD: 0,
          IMPELLA: 0,
          VA_ECMO: 0,
          VV_ECMO: 0,
        });
      }
      image.abort();
    }
  }, 30_000);

  it("forbids continuation after a post-solver authority failure", async () => {
    let commitCalls = 0;
    let poisoned = false;
    const session = await MainWireIntegratedTypedAuthoritySessionV1
      .createWithAcceptedStateAuthorityForTestV1(
        (initial) => {
          let current = initial;
          return Object.freeze({
            current: () => {
              if (poisoned) throw new Error("injected authority is poisoned");
              return current;
            },
            snapshot: () => current,
            commit: (candidate: typeof initial) => {
              current = candidate;
              commitCalls += 1;
              poisoned = true;
              throw new Error("injected candidate commit failed");
            },
          });
        },
      );
    const target = mainWireIntegratedModelPresentationTargetTimeSecV3(1);
    expect(() => session.advanceToPresentationTime(target))
      .toThrow("injected candidate commit failed");
    expect(commitCalls).toBe(1);
    expect(() => session.advanceToPresentationTime(target))
      .toThrow("injected authority is poisoned");
    expect(commitCalls).toBe(1);
  });

  it("uses fixed typed-state authority for 1,024 ticks without scientific drift", async () => {
    const reference = await MainWireIntegratedTypedAuthoritySessionV1.create();
    const oracle = await MainWireIntegratedModelSessionV3.create();
    const initialReport = reference.authorityReport();
    expect(initialReport).toMatchObject({
      authorityId: "main-wire-integrated-accepted-typed-state-authority-v1",
      fingerprint: "fnv1a32-44b16062",
      bufferByteLength: 22_360,
      fixedImageCount: 2,
      continuousSlotCount: 484,
      nullableContinuousSlotCount: 6,
      nullableStringSlotCount: 22,
      optionalRecordRootCount: 6,
      boundedArrayRootCount: 3,
      booleanSlotCount: 2,
      stringSlotCount: 229,
      dynamicRootCount: 0,
      externalImmutableRootCount: 57,
      containerCount: 163,
      commitCount: 0,
      externalImmutableIdentityMatchCount: 56,
      externalImmutableCanonicalMatchCount: 0,
      poisonedReason: null,
      directCandidateCommitCount: 0,
      directCandidateExactCommitCount: 0,
      directCandidateMirrorReuseCount: 0,
      modelOwnedCandidateCommitCount: 0,
      modelOwnedExactAuditCount: 0,
      directCompletionReaderPlanUseCount: 0,
      directExactCandidateMatchCount: 0,
      modelOwnedPromotionCount: 0,
    });
    const escapedState = reference.currentAcceptedState();
    const escapedTypedArray = firstFloat64Array(escapedState);
    if (escapedTypedArray === null || escapedTypedArray.length === 0) {
      throw new Error("accepted state contains no Float64Array");
    }
    const authoritativeValue = escapedTypedArray[0]!;
    escapedTypedArray[0] = authoritativeValue + 10_000;
    expect(firstFloat64Array(reference.currentAcceptedState())?.[0])
      .toBe(authoritativeValue);

    let sawCompletedBeat = false;
    for (let tick = 1; tick <= 1_024; tick += 1) {
      const target = mainWireIntegratedModelPresentationTargetTimeSecV3(tick);
      const actual = reference.advanceToPresentationTime(target);
      const expected = oracle.advanceToPresentationTime(target);
      expect(actual.status).toBe("advanced");
      expect(expected.status).toBe("advanced");
      if (actual.status !== "advanced" || expected.status !== "advanced") {
        throw new Error(`reference or oracle failed at tick ${tick}`);
      }
      expect(actual.acceptedRevision).toBe(expected.acceptedRevision);
      expectProjectedValuesScientificallyEquivalent(
        projectMainWireIntegratedModelSelectedValuesV3(
        actual.observation,
        MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
        ),
        projectMainWireIntegratedModelSelectedValuesV3(
          expected.observation,
          MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
        ),
      );
      sawCompletedBeat ||= actual.observation.completedBeatMetrics !== null;
    }

    const finalReport = reference.authorityReport();
    expect(finalReport.commitCount).toBeGreaterThanOrEqual(1_024);
    expect(finalReport.directCandidateCommitCount).toBe(
      finalReport.commitCount,
    );
    expect(finalReport.directCandidateMirrorReuseCount).toBe(
      finalReport.commitCount,
    );
    expect(
      finalReport.directCandidateExactCommitCount
      + finalReport.directCompletionReaderPlanUseCount,
    ).toBe(
      finalReport.commitCount,
    );
    expect(finalReport.directCandidateExactCommitCount).toBeGreaterThan(
      finalReport.commitCount * 0.95,
    );
    expect(finalReport.modelOwnedCandidateCommitCount).toBeGreaterThan(
      finalReport.commitCount * 0.95,
    );
    expect(finalReport.modelOwnedExactAuditCount).toBe(
      finalReport.modelOwnedCandidateCommitCount,
    );
    expect(finalReport.modelOwnedPromotionCount).toBe(
      finalReport.modelOwnedCandidateCommitCount,
    );
    expect(finalReport.directCompletionReaderPlanUseCount).toBeLessThan(
      finalReport.commitCount * 0.05,
    );
    expect(finalReport.directExactCandidateMatchCount).toBe(
      finalReport.directCandidateExactCommitCount,
    );
    expect(finalReport.externalImmutableIdentityMatchCount).toBe(
      (
        finalReport.commitCount
        + finalReport.directCompletionReaderPlanUseCount
        + 1
      ) * 56,
    );
    expect(finalReport.externalImmutableCanonicalMatchCount).toBe(0);
    expect(finalReport.highWaterStringBytes).toBeLessThanOrEqual(
      finalReport.stringArenaCapacityBytes,
    );
    expect(finalReport.highWaterDynamicBytes).toBeLessThanOrEqual(
      finalReport.dynamicArenaCapacityBytes,
    );
    expect(finalReport.boundedArrays).toEqual([
      {
        pointer: "/composedRhythm/pendingCalciumDeposits",
        capacity: 16,
        currentLength: 0,
        highWaterLength: 1,
      },
      {
        pointer: "/composedRhythm/pendingDistalVentricularImpulses",
        capacity: 16,
        currentLength: 0,
        highWaterLength: 1,
      },
      {
        pointer: "/composedRhythm/pendingProximalAvOutputs",
        capacity: 16,
        currentLength: 0,
        highWaterLength: 1,
      },
    ]);
    expect(finalReport.poisonedReason).toBeNull();
    expect(decodeCanonicalFlatDataV1(reference.snapshotAcceptedStateBytes()))
      .toEqual(reference.currentAcceptedState());
    expect(sawCompletedBeat).toBe(true);
    const completedBeatRestore =
      await MainWireIntegratedTypedAuthoritySessionV1.restoreCanonicalBinary(
        await reference.checkpointCanonicalBinary(),
      );
    expect(completedBeatRestore.observe().completedBeatMetrics)
      .toEqual(reference.observe().completedBeatMetrics);
  }, 120_000);

  it("keeps lean model-owned promotion scientifically equivalent", async () => {
    const previousTier = hotPathIntegrityTierV1();
    selectHotPathIntegrityTierV1("hot-path-lean");
    try {
      const reference = await MainWireIntegratedTypedAuthoritySessionV1.create();
      const oracle = await MainWireIntegratedModelSessionV3.create();
      for (let tick = 1; tick <= 1_024; tick += 1) {
        const target = mainWireIntegratedModelPresentationTargetTimeSecV3(tick);
        const actual = reference.advanceToPresentationTime(target);
        const expected = oracle.advanceToPresentationTime(target);
        expect(actual.status).toBe("advanced");
        expect(expected.status).toBe("advanced");
        if (actual.status !== "advanced" || expected.status !== "advanced") {
          throw new Error(`lean reference or oracle failed at tick ${tick}`);
        }
        expect(actual.acceptedRevision).toBe(expected.acceptedRevision);
        expectProjectedValuesScientificallyEquivalent(
          projectMainWireIntegratedModelSelectedValuesV3(
            actual.observation,
            MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
          ),
          projectMainWireIntegratedModelSelectedValuesV3(
            expected.observation,
            MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
          ),
        );
      }
      const report = reference.authorityReport();
      expect(report.modelOwnedCandidateCommitCount).toBeGreaterThan(
        report.commitCount * 0.95,
      );
      expect(report.modelOwnedExactAuditCount).toBe(0);
      expect(report.directExactCandidateMatchCount).toBeLessThan(
        report.commitCount * 0.05,
      );
      expect(decodeCanonicalFlatDataV1(reference.snapshotAcceptedStateBytes()))
        .toEqual(reference.currentAcceptedState());
    } finally {
      selectHotPathIntegrityTierV1(previousTier);
    }
  }, 120_000);

  it("keeps direct mirror admission exact when validation stamps are disabled", async () => {
    const previousMode = validationStampModeV1();
    selectValidationStampModeV1("validation-stamps-disabled");
    try {
      const reference = await MainWireIntegratedTypedAuthoritySessionV1.create();
      const oracle = await MainWireIntegratedModelSessionV3.create();
      const target = mainWireIntegratedModelPresentationTargetTimeSecV3(1);
      const actual = reference.advanceToPresentationTime(target);
      const expected = oracle.advanceToPresentationTime(target);
      expect(actual.status).toBe("advanced");
      expect(expected.status).toBe("advanced");
      if (actual.status !== "advanced" || expected.status !== "advanced") {
        throw new Error("reference or oracle failed at the first tick");
      }
      expect(actual.acceptedRevision).toBe(expected.acceptedRevision);
      expectProjectedValuesScientificallyEquivalent(
        projectMainWireIntegratedModelSelectedValuesV3(
          actual.observation,
          MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
        ),
        projectMainWireIntegratedModelSelectedValuesV3(
          expected.observation,
          MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
        ),
      );
      expect(reference.authorityReport()).toMatchObject({
        directCandidateCommitCount: 1,
        directCandidateExactCommitCount: 0,
        directCandidateMirrorReuseCount: 1,
        directCompletionReaderPlanUseCount: 1,
        directExactCandidateMatchCount: 0,
        poisonedReason: null,
      });
      expect(reference.currentAcceptedState())
        .toEqual(reference.observe().acceptedState);
      expect(decodeCanonicalFlatDataV1(reference.snapshotAcceptedStateBytes()))
        .toEqual(reference.currentAcceptedState());
    } finally {
      selectValidationStampModeV1(previousMode);
    }
  });

  it("projects from typed readback without returning accepted state", async () => {
    const reference = await MainWireIntegratedTypedAuthoritySessionV1.create();
    const oracle = await MainWireIntegratedModelSessionV3.create();
    const target = mainWireIntegratedModelPresentationTargetTimeSecV3(1);
    const outputIds = MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3;
    const actual = reference
      .advanceToPresentationTimeWithSelectedOutputProjectionV1(
        target,
        outputIds,
      );
    const expected = oracle.advanceToPresentationTime(target);
    expect(actual.advance.status).toBe("advanced");
    expect("observation" in actual.advance).toBe(false);
    expect(actual.outputProjectionDurationMs).toBeGreaterThanOrEqual(0);
    expect(expected.status).toBe("advanced");
    if (expected.status !== "advanced") {
      throw new Error("projection oracle failed");
    }
    expect(actual.projectedValues).toEqual(
      projectMainWireIntegratedModelSelectedValuesV3(
        reference.observe(),
        outputIds,
      ),
    );
    expectProjectedValuesScientificallyEquivalent(
      actual.projectedValues!,
      projectMainWireIntegratedModelSelectedValuesV3(
        expected.observation,
        outputIds,
      ),
    );

    const exposedObservation = reference.observe();
    const escaped = firstFloat64Array(exposedObservation.acceptedState);
    if (escaped === null || escaped.length === 0) {
      throw new Error("projected observation contains no Float64Array");
    }
    const authoritative = firstFloat64Array(reference.currentAcceptedState());
    if (authoritative === null || authoritative.length === 0) {
      throw new Error("authoritative snapshot contains no Float64Array");
    }
    const expectedValue = authoritative[0]!;
    escaped[0] = expectedValue + 10_000;
    expect(firstFloat64Array(reference.currentAcceptedState())?.[0])
      .toBe(expectedValue);
  });

  it("commits ordinary selected-output ticks without a public adapter", async () => {
    const previousTier = hotPathIntegrityTierV1();
    selectHotPathIntegrityTierV1("hot-path-lean");
    try {
      const reference =
        await MainWireIntegratedTypedAuthoritySessionV1.create();
      const oracle = await MainWireIntegratedModelSessionV3.create();
      for (let tick = 1; tick <= 600; tick += 1) {
        const target = mainWireIntegratedModelPresentationTargetTimeSecV3(tick);
        const actual = reference
          .advanceToPresentationTimeWithSelectedOutputProjectionV1(
            target,
            MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
          );
        const expected = oracle.advanceToPresentationTime(target);
        expect(actual.advance.status).toBe("advanced");
        expect(expected.status).toBe("advanced");
        if (expected.status !== "advanced") {
          throw new Error(`ordinary projection oracle failed at tick ${tick}`);
        }
        expectProjectedValuesScientificallyEquivalent(
          actual.projectedValues!,
          projectMainWireIntegratedModelSelectedValuesV3(
            expected.observation,
            MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
          ),
        );
      }
      const report = reference.authorityReport();
      expect(report.modelOwnedAdapterFreeCommitCount).toBeGreaterThan(550);
      expect(report.lazyMirrorRehydrateCount).toBeGreaterThan(0);
      expect(report.poisonedReason).toBeNull();
      expect(reference.currentAcceptedState()).toMatchObject({
        acceptedTimeSec: oracle.currentAcceptedState().acceptedTimeSec,
        revision: oracle.currentAcceptedState().revision,
      });
      const coldReadback = reference.observe();
      expect(coldReadback).toMatchObject({
        source: "typed-authority-readback",
        lastAcceptedStep: null,
      });
      expect(projectMainWireIntegratedModelSelectedValuesV3(
        coldReadback,
        ["hemodynamics.pressure.absolute.LV"],
      )["hemodynamics.pressure.absolute.LV"]).toMatchObject({
        value: null,
        availability: "not-evaluated-at-accepted-state",
      });
      expect(decodeCanonicalFlatDataV1(reference.snapshotAcceptedStateBytes()))
        .toEqual(reference.currentAcceptedState());
    } finally {
      selectHotPathIntegrityTierV1(previousTier);
    }
  }, 60_000);

  it("rejects an invalid selected-output plan before numerical mutation", async () => {
    const previousTier = hotPathIntegrityTierV1();
    selectHotPathIntegrityTierV1("hot-path-lean");
    try {
      const reference =
        await MainWireIntegratedTypedAuthoritySessionV1.create();
      const before = reference.currentAcceptedState();
      const outputId = "hemodynamics.pressure.absolute.LV" as const;
      expect(() => reference
        .advanceToPresentationTimeWithSelectedOutputProjectionV1(
          mainWireIntegratedModelPresentationTargetTimeSecV3(1),
          [outputId, outputId],
        ))
        .toThrow(`selected output ${outputId} is duplicated`);
      expect(reference.currentAcceptedState()).toEqual(before);
      expect(reference.authorityReport()).toMatchObject({
        commitCount: 0,
        modelOwnedAdapterFreeCommitCount: 0,
        poisonedReason: null,
      });
    } finally {
      selectHotPathIntegrityTierV1(previousTier);
    }
  });

  it("continues adapter-free selected outputs after a binary checkpoint", async () => {
    const previousTier = hotPathIntegrityTierV1();
    selectHotPathIntegrityTierV1("hot-path-lean");
    try {
      const source =
        await MainWireIntegratedTypedAuthoritySessionV1.create();
      const oracle = await MainWireIntegratedModelSessionV3.create();
      const checkpointTick = 377;
      const finalTick = 1_600;
      for (let tick = 1; tick <= checkpointTick; tick += 1) {
        const target = mainWireIntegratedModelPresentationTargetTimeSecV3(tick);
        const actual = source
          .advanceToPresentationTimeWithSelectedOutputProjectionV1(
            target,
            MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
          );
        const expected = oracle.advanceToPresentationTime(target);
        expect(expected.status).toBe("advanced");
        if (expected.status !== "advanced") {
          throw new Error(`checkpoint source oracle failed at tick ${tick}`);
        }
        expectProjectedValuesScientificallyEquivalent(
          actual.projectedValues!,
          projectMainWireIntegratedModelSelectedValuesV3(
            expected.observation,
            MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
          ),
        );
      }

      const restored = await MainWireIntegratedTypedAuthoritySessionV1
        .restoreCanonicalBinary(await source.checkpointCanonicalBinary());
      expect(restored.currentAcceptedState())
        .toEqual(source.currentAcceptedState());

      for (let tick = checkpointTick + 1; tick <= finalTick; tick += 1) {
        const target = mainWireIntegratedModelPresentationTargetTimeSecV3(tick);
        const actual = restored
          .advanceToPresentationTimeWithSelectedOutputProjectionV1(
            target,
            MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
          );
        const uninterrupted = source
          .advanceToPresentationTimeWithSelectedOutputProjectionV1(
            target,
            MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
          );
        const expected = oracle.advanceToPresentationTime(target);
        expect(expected.status).toBe("advanced");
        if (expected.status !== "advanced") {
          throw new Error(`checkpoint continuation oracle failed at tick ${tick}`);
        }
        expectProjectedValuesScientificallyEquivalent(
          actual.projectedValues!,
          projectMainWireIntegratedModelSelectedValuesV3(
            expected.observation,
            MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
          ),
        );
        expect(actual.advance).toEqual(uninterrupted.advance);
        expect(actual.projectedValues).toEqual(uninterrupted.projectedValues);
      }

      expect(restored.currentAcceptedState()).toMatchObject({
        acceptedTimeSec: oracle.currentAcceptedState().acceptedTimeSec,
        revision: oracle.currentAcceptedState().revision,
      });
      expect(restored.authorityReport()).toMatchObject({
        poisonedReason: null,
      });
      expect(restored.authorityReport().modelOwnedAdapterFreeCommitCount)
        .toBeGreaterThan(1_100);
      expect(restored.snapshotAcceptedStateBytes())
        .toEqual(source.snapshotAcceptedStateBytes());
      expect(restored.coupledPredictorReport()).toMatchObject({
        hasAcceptedPair: true,
        historyDepth: 4,
      });
      expect(decodeCanonicalFlatDataV1(restored.snapshotAcceptedStateBytes()))
        .toEqual(restored.currentAcceptedState());
    } finally {
      selectHotPathIntegrityTierV1(previousTier);
    }
  }, 120_000);

  it("continues scientifically after a public Standard checkpoint", async () => {
    const previousTier = hotPathIntegrityTierV1();
    selectHotPathIntegrityTierV1("hot-path-lean");
    try {
      const source =
        await MainWireIntegratedTypedAuthoritySessionV1.create();
      const checkpointTick = 377;
      const finalTick = 544;
      for (let tick = 1; tick <= checkpointTick; tick += 1) {
        const result = source
          .advanceToPresentationTimeWithSelectedOutputProjectionV1(
            mainWireIntegratedModelPresentationTargetTimeSecV3(tick),
            MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
          );
        expect(result.advance.status).toBe("advanced");
      }

      const restored = await MainWireIntegratedTypedAuthoritySessionV1
        .restoreStandardExactCheckpoint(await source.checkpointStandardExact());
      expect(restored.currentAcceptedState())
        .toEqual(source.currentAcceptedState());
      expect(restored.coupledPredictorReport()).toMatchObject({
        hasAcceptedPair: false,
        historyDepth: 0,
      });

      for (let tick = checkpointTick + 1; tick <= finalTick; tick += 1) {
        const target = mainWireIntegratedModelPresentationTargetTimeSecV3(tick);
        const uninterrupted = source
          .advanceToPresentationTimeWithSelectedOutputProjectionV1(
            target,
            MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
          );
        const actual = restored
          .advanceToPresentationTimeWithSelectedOutputProjectionV1(
            target,
            MAIN_WIRE_INTEGRATED_MODEL_OUTPUT_IDS_V3,
          );
        expect(actual.advance.status).toBe("advanced");
        expect(uninterrupted.advance.status).toBe("advanced");
        expect(actual.advance.acceptedRevision)
          .toBe(uninterrupted.advance.acceptedRevision);
        expectProjectedValuesScientificallyEquivalent(
          actual.projectedValues!,
          uninterrupted.projectedValues!,
        );
      }
      expect(restored.coupledPredictorReport()).toMatchObject({
        hasAcceptedPair: true,
        historyDepth: 4,
      });
    } finally {
      selectHotPathIntegrityTierV1(previousTier);
    }
  }, 120_000);

  it("restores a tamper-evident binary checkpoint with exact continuation", async () => {
    const source = await MainWireIntegratedTypedAuthoritySessionV1.create();
    for (let tick = 1; tick <= 377; tick += 1) {
      const result = source.advanceToPresentationTime(
        mainWireIntegratedModelPresentationTargetTimeSecV3(tick),
      );
      expect(result.status).toBe("advanced");
    }
    const first = await source.checkpointCanonicalBinary();
    const second = await source.checkpointCanonicalBinary();
    expect(first).toEqual(second);
    const restored =
      await MainWireIntegratedTypedAuthoritySessionV1
        .restoreCanonicalBinary(first);
    const restoredInitialReport = restored.authorityReport();
    expect(
      restoredInitialReport.externalImmutableIdentityMatchCount
        + restoredInitialReport.externalImmutableCanonicalMatchCount,
    ).toBe(56);
    expect(restored.currentAcceptedState()).toEqual(source.currentAcceptedState());

    for (let tick = 378; tick <= 544; tick += 1) {
      const target = mainWireIntegratedModelPresentationTargetTimeSecV3(tick);
      const expected = source.advanceToPresentationTime(target);
      const actual = restored.advanceToPresentationTime(target);
      expect(actual).toEqual(expected);
    }
    expect(restored.authorityReport()).toMatchObject({
      fixedImageCount: 2,
      poisonedReason: null,
    });

    const decodedCheckpoint = await decodeCanonicalFlatCheckpointV1(first) as
      Readonly<{
        coupledPredictor: Readonly<{
          currentAcceptedMl: readonly number[];
        }>;
      }>;
    const mismatchedRoot = [...decodedCheckpoint.coupledPredictor
      .currentAcceptedMl];
    mismatchedRoot[0] += 1e-6;
    const semanticallyTampered = await encodeCanonicalFlatCheckpointV1(
      Object.freeze({
        ...decodedCheckpoint,
        coupledPredictor: Object.freeze({
          ...decodedCheckpoint.coupledPredictor,
          currentAcceptedMl: Object.freeze(mismatchedRoot),
        }),
      }),
    );
    await expect(
      MainWireIntegratedTypedAuthoritySessionV1.restoreCanonicalBinary(
        semanticallyTampered,
      ),
    ).rejects.toThrow(/predictor checkpoint/);

    const tampered = first.slice();
    tampered[20] ^= 0x80;
    await expect(
      MainWireIntegratedTypedAuthoritySessionV1.restoreCanonicalBinary(
        tampered,
      ),
    ).rejects.toThrow("SHA-256 mismatch");
  }, 120_000);
});

function kernelCatalogFromDescriptor(
  descriptor: ExecutionPlanDescriptorV1,
) {
  return Object.freeze({
    componentKernelIds: Object.freeze(Array.from(new Set(
      descriptor.stateLayout.blocks.map(({ kernelId }) => kernelId),
    ))),
    hydraulicPathKernelIds: Object.freeze(Array.from(new Set(
      descriptor.hydraulicGraph.pathKernelIds,
    ))),
    solveSystemKernelIds: Object.freeze(Array.from(new Set(
      descriptor.solveGroups.map(({ systemKernelId }) => systemKernelId),
    ))),
  });
}

function firstFloat64Array(value: unknown): Float64Array | null {
  if (value instanceof Float64Array) return value;
  if (value === null || typeof value !== "object") return null;
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor)) continue;
    const nested = firstFloat64Array(descriptor.value);
    if (nested !== null) return nested;
  }
  return null;
}

function expectProjectedValuesScientificallyEquivalent(
  actual: Readonly<Record<string, Readonly<{
    outputId: string;
    availability: string;
    quality: string;
    value: number | null;
  }>>>,
  expected: Readonly<Record<string, Readonly<{
    outputId: string;
    availability: string;
    quality: string;
    value: number | null;
  }>>>,
): void {
  expect(Object.keys(actual)).toEqual(Object.keys(expected));
  for (const outputId of Object.keys(expected)) {
    const actualValue = actual[outputId];
    const expectedValue = expected[outputId];
    expect(actualValue).toMatchObject({
      outputId: expectedValue?.outputId,
      availability: expectedValue?.availability,
      quality: expectedValue?.quality,
    });
    if (actualValue?.value === null || expectedValue?.value === null) {
      expect(actualValue?.value).toBe(expectedValue?.value);
      continue;
    }
    const scale = Math.max(
      1,
      Math.abs(actualValue.value),
      Math.abs(expectedValue.value),
    );
    const difference = Math.abs(actualValue.value - expectedValue.value);
    if (difference > 1e-9 + 1e-6 * scale) {
      throw new Error(
        `${outputId} diverged by ${difference} at scale ${scale}`,
      );
    }
  }
}

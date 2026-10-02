import {
  decodeCanonicalFlatDataV1,
  encodeCanonicalFlatDataIntoV1,
  measureCanonicalFlatDataV1,
} from "@/engine/vnext/CanonicalFlatDataV1";
import {
  assertFlatNumericalStateShapeV1,
  createFlatNumericalStateLayoutV1,
  readFlatNumericalStatePathV1,
  type FlatNumericalPathSegmentV1,
  type FlatNumericalSlotV1,
  type FlatNumericalStateLayoutV1,
  type FlatNumericalStateLayoutOptionsV1,
} from "@/engine/vnext/FlatNumericalStateV1";

export const TRANSACTIONAL_TYPED_STATE_IMAGE_V1_ID =
  "circleheart-transactional-typed-state-image-v1" as const;
export const TRANSACTIONAL_TYPED_STATE_MANIFEST_V1_SCHEMA_ID =
  "circleheart-transactional-typed-state-manifest-v1" as const;
export const TRANSACTIONAL_TYPED_STATE_COMPLETION_PLAN_V1_SCHEMA_ID =
  "circleheart-transactional-typed-state-completion-plan-v1" as const;
export const TRANSACTIONAL_TYPED_STATE_PROMOTION_PLAN_V1_SCHEMA_ID =
  "circleheart-transactional-typed-state-promotion-plan-v1" as const;

const MAX_ARENA_CAPACITY_BYTES = 16 * 1024 * 1024;
const UTF8_ENCODER = new TextEncoder();
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

type TypedStateBoundedArrayNodeV1 = Readonly<{
  kind: "bounded-array";
  slotIndex: number;
  items: readonly TypedStateNodeV1[];
}>;

type TypedStateNodeV1 =
  | Readonly<{ kind: "f64"; slotIndex: number }>
  | Readonly<{ kind: "nullable-f64"; slotIndex: number }>
  | Readonly<{ kind: "nullable-string"; slotIndex: number }>
  | Readonly<{
    kind: "optional-record";
    slotIndex: number;
    value: TypedStateNodeV1;
  }>
  | TypedStateBoundedArrayNodeV1
  | Readonly<{ kind: "boolean"; slotIndex: number }>
  | Readonly<{ kind: "string"; slotIndex: number }>
  | Readonly<{ kind: "dynamic"; slotIndex: number }>
  | Readonly<{ kind: "external"; slotIndex: number }>
  | Readonly<{
    kind: "record";
    nullPrototype: boolean;
    entries: readonly Readonly<{
      key: string;
      node: TypedStateNodeV1;
    }>[];
  }>
  | Readonly<{
    kind: "typed-array";
    constructorTag: NumericTypedArrayTagV1;
    items: readonly TypedStateNodeV1[];
  }>
  | Readonly<{
    kind: "array";
    items: readonly TypedStateNodeV1[];
  }>;

type TypedStateSubtreeValueV1<TState, TPath extends readonly string[]> =
  TPath extends readonly [] ? TState
    : TPath extends readonly [infer TKey, ...infer TRest extends readonly string[]]
      ? TKey extends keyof TState ? TypedStateSubtreeValueV1<TState[TKey], TRest> : unknown
      : unknown;

type NumericTypedArrayV1 =
  | Float64Array
  | Float32Array
  | Int32Array
  | Uint32Array
  | Int16Array
  | Uint16Array
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray;

type NumericTypedArrayTagV1 =
  | "Float64Array"
  | "Float32Array"
  | "Int32Array"
  | "Uint32Array"
  | "Int16Array"
  | "Uint16Array"
  | "Int8Array"
  | "Uint8Array"
  | "Uint8ClampedArray";

type TypedStateImageLayoutV1 = Readonly<{
  continuousByteOffset: number;
  nullableContinuousByteOffset: number;
  nullableContinuousPresenceByteOffset: number;
  booleanByteOffset: number;
  stringMetadataByteOffset: number;
  nullableStringMetadataByteOffset: number;
  nullableStringPresenceByteOffset: number;
  optionalRecordPresenceByteOffset: number;
  boundedArrayLengthByteOffset: number;
  dynamicMetadataByteOffset: number;
  stringArenaByteOffset: number;
  dynamicArenaByteOffset: number;
  bufferByteLength: number;
}>;

export type TransactionalTypedStateExternalImmutableRootV1 = Readonly<{
  path: readonly FlatNumericalPathSegmentV1[];
  pointer: string;
  bindingPath: readonly FlatNumericalPathSegmentV1[];
  bindingPointer: string;
  value: unknown;
  canonicalByteLength: number;
}>;

export type TransactionalTypedStateManifestV1 = Readonly<{
  schemaId: typeof TRANSACTIONAL_TYPED_STATE_MANIFEST_V1_SCHEMA_ID;
  layoutId: string;
  fingerprint: string;
  numericalLayout: FlatNumericalStateLayoutV1;
  stringArenaCapacityBytes: number;
  dynamicArenaCapacityBytes: number;
  bufferByteLength: number;
  externalImmutableRoots:
    readonly TransactionalTypedStateExternalImmutableRootV1[];
  rootNode: TypedStateNodeV1;
  boundedArrayNodes: readonly TypedStateBoundedArrayNodeV1[];
  imageLayout: TypedStateImageLayoutV1;
}>;

export type TransactionalTypedStateImageReportV1 = Readonly<{
  authorityId: typeof TRANSACTIONAL_TYPED_STATE_IMAGE_V1_ID;
  layoutId: string;
  fingerprint: string;
  continuousSlotCount: number;
  nullableContinuousSlotCount: number;
  nullableStringSlotCount: number;
  optionalRecordRootCount: number;
  boundedArrayRootCount: number;
  booleanSlotCount: number;
  stringSlotCount: number;
  dynamicRootCount: number;
  externalImmutableRootCount: number;
  containerCount: number;
  fixedImageCount: 2;
  bufferByteLength: number;
  stringArenaCapacityBytes: number;
  dynamicArenaCapacityBytes: number;
  currentStringBytes: number;
  currentDynamicBytes: number;
  highWaterStringBytes: number;
  highWaterDynamicBytes: number;
  boundedArrays: readonly Readonly<{
    pointer: string;
    capacity: number;
    currentLength: number;
    highWaterLength: number;
  }>[];
  activeBufferIndex: 0 | 1;
  commitCount: number;
  externalImmutableIdentityMatchCount: number;
  externalImmutableCanonicalMatchCount: number;
  directCompletionReaderPlanUseCount: number;
  directExactCandidateMatchCount: number;
  modelOwnedPromotionCount: number;
  staged: boolean;
}>;

export type TransactionalTypedStateImageSnapshotV1 = Readonly<{
  continuous: Float64Array;
  nullableContinuous: Float64Array;
  nullableContinuousPresent: Uint8Array;
  booleans: Uint8Array;
  stringMetadata: Uint32Array;
  nullableStringMetadata: Uint32Array;
  nullableStringPresent: Uint8Array;
  optionalRecordPresent: Uint8Array;
  boundedArrayLengths: Uint32Array;
  stringBytes: Uint8Array;
  dynamicMetadata: Uint32Array;
  dynamicBytes: Uint8Array;
}>;

/**
 * Read-only, live cursor over whichever fixed image is currently accepted.
 * It never exposes an ArrayBuffer or typed-array view, so a caller cannot
 * mutate the transaction authority. Slot numbers are bound by the manifest
 * fingerprint and are intended to be generated into a model-owned cursor.
 */
export type TransactionalTypedStateCurrentCursorV1 = Readonly<{
  layoutId: string;
  fingerprint: string;
  readContinuous(slotIndex: number): number;
  readNullableContinuous(slotIndex: number): number | null;
  readNullableString(slotIndex: number): string | null;
  readBoolean(slotIndex: number): boolean;
  readString(slotIndex: number): string;
  readDynamic(slotIndex: number): unknown;
  readBoundedArray(slotIndex: number): readonly unknown[];
}>;

/**
 * Generation-bound writer for the inactive candidate image. V1 intentionally
 * permits direct writes only for fixed numerical leaves; strings and dynamic
 * roots remain copied from current until their model owners receive bounded
 * tagged layouts.
 */
export type TransactionalTypedStateCandidateCursorV1 = Readonly<{
  layoutId: string;
  fingerprint: string;
  readContinuous(slotIndex: number): number;
  writeContinuous(slotIndex: number, value: number): void;
  readNullableContinuous(slotIndex: number): number | null;
  writeNullableContinuous(slotIndex: number, value: number | null): void;
  readBoolean(slotIndex: number): boolean;
  writeBoolean(slotIndex: number, value: boolean): void;
  readString(slotIndex: number): string;
  /**
   * Replaces one already allocated string slice without moving arena metadata.
   * Model-owned hot fields such as fixed-width fingerprints use this path;
   * variable-length event identifiers remain on exhaustive completion.
   */
  writeStringSameByteLength(slotIndex: number, value: string): void;
}>;

export type TransactionalTypedStateRetainedSlotsV1 = Readonly<{
  continuous?: readonly number[];
  booleans?: readonly number[];
}>;

export type TransactionalTypedStateCompletionPlanV1 = Readonly<{
  schemaId: typeof TRANSACTIONAL_TYPED_STATE_COMPLETION_PLAN_V1_SCHEMA_ID;
  layoutId: string;
  fingerprint: string;
  retainedContinuousSlots: readonly number[];
  retainedBooleanSlots: readonly number[];
}>;

/** Fixed-size subtree completion. Strings are invariant labels; variable
 * arenas and optional/external roots require the exhaustive completion API. */
export type TransactionalTypedStateRootCompletionPlanV1 = Readonly<{
  schemaId: "circleheart-transactional-typed-root-completion-plan-v1";
  layoutId: string;
  fingerprint: string;
  rootKey: string;
  requiredContinuousSlots: readonly number[];
  requiredNullableContinuousSlots: readonly number[];
  requiredBooleanSlots: readonly number[];
}>;

export type TransactionalTypedStateRequiredWritesV1 = Readonly<{
  continuous?: readonly number[];
  nullableContinuous?: readonly number[];
  booleans?: readonly number[];
  strings?: readonly number[];
}>;

/**
 * Model-owned proof obligation for a direct typed transaction. Unlike a
 * completion plan, this plan does not describe which object leaves to copy:
 * every listed slot must have been explicitly written through the current
 * generation-bound candidate cursor before promotion.
 */
export type TransactionalTypedStatePromotionPlanV1 = Readonly<{
  schemaId: typeof TRANSACTIONAL_TYPED_STATE_PROMOTION_PLAN_V1_SCHEMA_ID;
  layoutId: string;
  fingerprint: string;
  requiredContinuousSlots: readonly number[];
  requiredNullableContinuousSlots: readonly number[];
  requiredBooleanSlots: readonly number[];
  requiredStringSlots: readonly number[];
}>;

type MutableImageV1 = Readonly<{
  buffer: ArrayBuffer;
  continuous: Float64Array;
  nullableContinuous: Float64Array;
  nullableContinuousPresent: Uint8Array;
  booleans: Uint8Array;
  stringMetadata: Uint32Array;
  nullableStringMetadata: Uint32Array;
  nullableStringPresent: Uint8Array;
  optionalRecordPresent: Uint8Array;
  boundedArrayLengths: Uint32Array;
  dynamicMetadata: Uint32Array;
  stringArena: Uint8Array;
  dynamicArena: Uint8Array;
}>;

type CompletionPlanInternalV1 = Readonly<{
  manifest: TransactionalTypedStateManifestV1;
  retainedContinuous: ReadonlySet<number>;
  retainedBooleans: ReadonlySet<number>;
  writableContinuous: readonly number[];
  writableBooleans: readonly number[];
  readers: DirectCompletionReadersV1;
}>;

type PromotionPlanInternalV1 = Readonly<{
  manifest: TransactionalTypedStateManifestV1;
  requiredContinuous: readonly number[];
  requiredNullableContinuous: readonly number[];
  requiredBooleans: readonly number[];
  requiredStrings: readonly number[];
}>;

type DirectPathReaderV1 = (root: unknown) => unknown;

type DirectCompletionReadersV1 = Readonly<{
  externalImmutable: readonly DirectPathReaderV1[];
  optionalRecords: readonly DirectPathReaderV1[];
  boundedArrays: readonly DirectPathReaderV1[];
  continuous: readonly DirectPathReaderV1[];
  nullableContinuous: readonly DirectPathReaderV1[];
  booleans: readonly DirectPathReaderV1[];
  strings: readonly DirectPathReaderV1[];
  nullableStrings: readonly DirectPathReaderV1[];
  dynamicRoots: readonly DirectPathReaderV1[];
}>;

const EXTERNAL_IMMUTABLE_CANONICAL_BYTES = new WeakMap<
  TransactionalTypedStateManifestV1,
  readonly Uint8Array[]
>();
const COMPLETION_PLAN_INTERNALS = new WeakMap<
  TransactionalTypedStateCompletionPlanV1,
  CompletionPlanInternalV1
>();
const PROMOTION_PLAN_INTERNALS = new WeakMap<
  TransactionalTypedStatePromotionPlanV1,
  PromotionPlanInternalV1
>();
type RootCompletionOperationV1 = Readonly<{
  check(value: unknown, cursor: TransactionalTypedStateCandidateCursorV1): void;
  write(value: unknown, cursor: TransactionalTypedStateCandidateCursorV1): void;
}>;
const ROOT_COMPLETION_PLAN_INTERNALS = new WeakMap<TransactionalTypedStateRootCompletionPlanV1,
  Readonly<{ manifest: TransactionalTypedStateManifestV1; operation: RootCompletionOperationV1 }>>();

/**
 * Compiles one exact, model-owned state topology. Mutable fixed leaves receive
 * typed slots. Nullable or variable-array roots receive bounded canonical
 * payload slots. Explicit deeply frozen configuration roots remain outside the
 * images and are rebound only after identity or canonical-equality admission.
 */
export function createTransactionalTypedStateManifestV1(
  layoutId: string,
  referenceState: unknown,
  stringArenaCapacityBytes: number,
  dynamicArenaCapacityBytes: number,
  layoutOptions: FlatNumericalStateLayoutOptionsV1 = {},
): TransactionalTypedStateManifestV1 {
  assertArenaCapacity(stringArenaCapacityBytes, "string");
  assertArenaCapacity(dynamicArenaCapacityBytes, "dynamic", true);
  const numericalLayout = createFlatNumericalStateLayoutV1(
    layoutId,
    referenceState,
    layoutOptions,
  );
  if (
    numericalLayout.excludedDynamicRoots.length > 0
    && dynamicArenaCapacityBytes === 0
  ) {
    throw new Error(
      "Transactional typed state dynamic roots require a positive arena capacity",
    );
  }
  for (const root of numericalLayout.optionalRecordRoots) {
    assertTransitivelyFrozenData(
      root.template,
      `${root.pointer} optional-record template`,
      new Set<object>(),
    );
  }
  for (const root of numericalLayout.boundedArrayRoots) {
    assertTransitivelyFrozenData(
      root.itemTemplate,
      `${root.pointer} bounded-array item template`,
      new Set<object>(),
    );
  }
  const rootNode = compileNode(referenceState, [], numericalLayout);
  const boundedArrayNodes = Object.freeze(
    numericalLayout.boundedArrayRoots.map((root, slotIndex) =>
      compileBoundedArrayNode(root.itemTemplate, root.path, slotIndex, root.capacity,
        numericalLayout)),
  );
  const aliasByPointer = new Map(
    numericalLayout.externalImmutableAliases.map((alias) =>
      [alias.pointer, alias] as const),
  );
  const externalImmutableRoots = numericalLayout.externalImmutableRoots.map(
    (root) => {
      const alias = aliasByPointer.get(root.pointer);
      const bindingPath = alias?.sourcePath ?? root.path;
      const bindingPointer = alias?.sourcePointer ?? root.pointer;
      const value = readFlatNumericalStatePathV1(
        referenceState,
        bindingPath,
      );
      assertTransitivelyFrozenData(value, root.pointer, new Set<object>());
      const canonicalBytes = encodeCanonicalBytes(value);
      return Object.freeze({
        path: root.path,
        pointer: root.pointer,
        bindingPath,
        bindingPointer,
        value,
        canonicalByteLength: canonicalBytes.byteLength,
        canonicalBytes,
      });
    },
  );
  const imageLayout = createImageLayout(
    numericalLayout,
    stringArenaCapacityBytes,
    dynamicArenaCapacityBytes,
  );
  const fingerprint = manifestFingerprint(
    numericalLayout,
    stringArenaCapacityBytes,
    dynamicArenaCapacityBytes,
  );
  const manifest = Object.freeze({
    schemaId: TRANSACTIONAL_TYPED_STATE_MANIFEST_V1_SCHEMA_ID,
    layoutId,
    fingerprint,
    numericalLayout,
    stringArenaCapacityBytes,
    dynamicArenaCapacityBytes,
    bufferByteLength: imageLayout.bufferByteLength,
    externalImmutableRoots: Object.freeze(
      externalImmutableRoots.map(({ canonicalBytes: _canonicalBytes, ...root }) =>
        Object.freeze(root)),
    ),
    rootNode,
    boundedArrayNodes,
    imageLayout,
  });
  EXTERNAL_IMMUTABLE_CANONICAL_BYTES.set(
    manifest,
    Object.freeze(externalImmutableRoots.map(({ canonicalBytes }) =>
      canonicalBytes)),
  );
  return manifest;
}

/** Proves the compiler derived every slot, node and arena offset together.
 * Structural copies cannot carry this provenance, even with the same digest.
 * This is a layout proof only, not admission of any numerical state. */
export function assertTransactionalTypedStateManifestIssuedV1(manifest: TransactionalTypedStateManifestV1): void {
  if (!EXTERNAL_IMMUTABLE_CANONICAL_BYTES.has(manifest)) {
    throw new Error("Transactional typed state manifest is not factory-issued");
  }
}

/**
 * Two fixed ArrayBuffers plus manifest-owned immutable cold roots form a
 * transaction boundary. `stage` writes only the inactive image; `promote` is
 * an infallible index swap after all validation.
 */
export class TransactionalTypedStateImageV1<TState> {
  readonly authorityId = TRANSACTIONAL_TYPED_STATE_IMAGE_V1_ID;

  readonly #manifest: TransactionalTypedStateManifestV1;
  readonly #images: readonly [MutableImageV1, MutableImageV1];
  readonly #currentCursor: TransactionalTypedStateCurrentCursorV1;
  readonly #admitDirectCompletionCandidate:
    ((candidate: TState) => TState) | null;
  #activeIndex: 0 | 1 = 0;
  #commitCount = 0;
  #staged = false;
  #stagedStringBytes = 0;
  #stagedDynamicBytes = 0;
  #currentStringBytes = 0;
  #currentDynamicBytes = 0;
  #highWaterStringBytes = 0;
  #highWaterDynamicBytes = 0;
  readonly #highWaterBoundedArrayLengths: Uint32Array;
  readonly #candidateWrittenContinuous: Uint8Array;
  readonly #candidateWrittenNullableContinuous: Uint8Array;
  readonly #candidateWrittenBooleans: Uint8Array;
  readonly #candidateWrittenStrings: Uint8Array;
  #candidateGeneration = 0;
  #externalImmutableIdentityMatchCount = 0;
  #externalImmutableCanonicalMatchCount = 0;
  #directCompletionReaderPlanUseCount = 0;
  #directExactCandidateMatchCount = 0;
  #modelOwnedPromotionCount = 0;

  constructor(
    manifest: TransactionalTypedStateManifestV1,
    initialState: TState,
    /**
     * A model-owned exact-boundary validator may replace the generic shape
     * walk for direct completion only. It executes synchronously before any
     * candidate byte is written, and identity preservation is mandatory.
     * Normal `stage` commits and images without this validator remain on the
     * complete generic validation path.
     */
    admitDirectCompletionCandidate?: (candidate: TState) => TState,
  ) {
    this.#manifest = manifest;
    this.#admitDirectCompletionCandidate =
      admitDirectCompletionCandidate ?? null;
    this.#highWaterBoundedArrayLengths = new Uint32Array(
      manifest.numericalLayout.boundedArrayRoots.length,
    );
    this.#candidateWrittenContinuous = new Uint8Array(
      manifest.numericalLayout.continuousSlots.length,
    );
    this.#candidateWrittenNullableContinuous = new Uint8Array(
      manifest.numericalLayout.nullableContinuousSlots.length,
    );
    this.#candidateWrittenBooleans = new Uint8Array(
      manifest.numericalLayout.booleanSlots.length,
    );
    this.#candidateWrittenStrings = new Uint8Array(
      manifest.numericalLayout.stringSlots.length,
    );
    this.#images = Object.freeze([
      createImage(manifest),
      createImage(manifest),
    ]);
    this.#currentCursor = Object.freeze({
      layoutId: manifest.layoutId,
      fingerprint: manifest.fingerprint,
      readContinuous: (slotIndex: number) =>
        this.readCurrentContinuous(slotIndex),
      readNullableContinuous: (slotIndex: number) =>
        this.readCurrentNullableContinuous(slotIndex),
      readNullableString: (slotIndex: number) =>
        this.readCurrentNullableString(slotIndex),
      readBoolean: (slotIndex: number) =>
        this.readCurrentBoolean(slotIndex),
      readString: (slotIndex: number) =>
        this.readCurrentString(slotIndex),
      readDynamic: (slotIndex: number) =>
        this.readCurrentDynamic(slotIndex),
      readBoundedArray: (slotIndex: number) =>
        this.readCurrentBoundedArray(slotIndex),
    });
    this.stage(initialState);
    this.promote();
    this.#commitCount = 0;
  }

  stage(candidate: TState): void {
    if (this.#staged) {
      throw new Error("Transactional typed state already has a staged candidate");
    }
    this.assertExternalImmutableRootsMatch(candidate);
    assertFlatNumericalStateShapeV1(
      this.#manifest.numericalLayout,
      candidate,
    );
    const candidateImage = this.#images[this.inactiveIndex()];
    writeOptionalRecordPresence(this.#manifest, candidate, candidateImage);
    writeBoundedArrayLengths(this.#manifest, candidate, candidateImage);
    writeFixedLeaves(this.#manifest, candidate, candidateImage);
    writeNullableContinuousLeaves(this.#manifest, candidate, candidateImage);
    const stringBytes = writeStrings(this.#manifest, candidate, candidateImage);
    const dynamicBytes = writeDynamicRoots(
      this.#manifest,
      candidate,
      candidateImage,
    );
    this.#stagedStringBytes = stringBytes;
    this.#stagedDynamicBytes = dynamicBytes;
    this.#staged = true;
  }

  /**
   * Copies current into inactive storage once, then returns a cursor that can
   * update fixed slots without allocating candidate objects. A model-owned
   * transaction may promote after explicit required-write coverage and its
   * own scientific seals; event/cold paths can still complete or audit against
   * an admitted object mirror.
   */
  beginCandidateFromCurrent(): TransactionalTypedStateCandidateCursorV1 {
    if (this.#staged) {
      throw new Error("Transactional typed state already has a staged candidate");
    }
    const current = this.#images[this.#activeIndex];
    const candidate = this.#images[this.inactiveIndex()];
    new Uint8Array(candidate.buffer).set(new Uint8Array(current.buffer));
    this.#stagedStringBytes = this.#currentStringBytes;
    this.#stagedDynamicBytes = this.#currentDynamicBytes;
    this.#staged = true;
    this.#candidateWrittenContinuous.fill(0);
    this.#candidateWrittenNullableContinuous.fill(0);
    this.#candidateWrittenBooleans.fill(0);
    this.#candidateWrittenStrings.fill(0);
    this.#candidateGeneration += 1;
    const generation = this.#candidateGeneration;
    return Object.freeze({
      layoutId: this.#manifest.layoutId,
      fingerprint: this.#manifest.fingerprint,
      readContinuous: (slotIndex: number) =>
        this.readCandidateContinuous(generation, slotIndex),
      writeContinuous: (slotIndex: number, value: number) =>
        this.writeCandidateContinuous(generation, slotIndex, value),
      readNullableContinuous: (slotIndex: number) =>
        this.readCandidateNullableContinuous(generation, slotIndex),
      writeNullableContinuous: (slotIndex: number, value: number | null) =>
        this.writeCandidateNullableContinuous(generation, slotIndex, value),
      readBoolean: (slotIndex: number) =>
        this.readCandidateBoolean(generation, slotIndex),
      writeBoolean: (slotIndex: number, value: boolean) =>
        this.writeCandidateBoolean(generation, slotIndex, value),
      readString: (slotIndex: number) =>
        this.readCandidateString(generation, slotIndex),
      writeStringSameByteLength: (slotIndex: number, value: string) =>
        this.writeCandidateStringSameByteLength(
          generation,
          slotIndex,
          value,
        ),
    });
  }

  /**
   * Compiles retained-slot membership once at cold initialization. The plan is
   * bound to this exact manifest instance and cannot be forged by structural
   * data alone.
   */
  createCompletionPlan(
    retained: TransactionalTypedStateRetainedSlotsV1,
  ): TransactionalTypedStateCompletionPlanV1 {
    const retainedContinuous = retainedSlotSet(
      retained.continuous,
      this.#manifest.numericalLayout.continuousSlots.length,
      "continuous",
    );
    const retainedBooleans = retainedSlotSet(
      retained.booleans,
      this.#manifest.numericalLayout.booleanSlots.length,
      "boolean",
    );
    const plan = Object.freeze({
      schemaId: TRANSACTIONAL_TYPED_STATE_COMPLETION_PLAN_V1_SCHEMA_ID,
      layoutId: this.#manifest.layoutId,
      fingerprint: this.#manifest.fingerprint,
      retainedContinuousSlots: Object.freeze([...retainedContinuous]),
      retainedBooleanSlots: Object.freeze([...retainedBooleans]),
    });
    COMPLETION_PLAN_INTERNALS.set(plan, Object.freeze({
      manifest: this.#manifest,
      retainedContinuous,
      retainedBooleans,
      writableContinuous: complementSlotIndices(
        this.#manifest.numericalLayout.continuousSlots.length,
        retainedContinuous,
      ),
      writableBooleans: complementSlotIndices(
        this.#manifest.numericalLayout.booleanSlots.length,
        retainedBooleans,
      ),
      readers: compileDirectCompletionReaders(this.#manifest),
    }));
    return plan;
  }

  createRootCompletionPlan<TKey extends keyof TState & string>(rootKey: TKey): TransactionalTypedStateRootCompletionPlanV1 {
    const root = this.#manifest.rootNode;
    if (root.kind !== "record") throw new Error("Transactional typed state root is not a record");
    const entry = root.entries.find(candidate => candidate.key === rootKey);
    if (!entry) throw new Error(`Transactional typed state root ${rootKey} is unavailable`);
    const required = { continuous: [] as number[], nullableContinuous: [] as number[], booleans: [] as number[] };
    const operation = compileFixedRootCompletionV1(entry.node, required);
    const plan = Object.freeze({
      schemaId: "circleheart-transactional-typed-root-completion-plan-v1" as const,
      layoutId: this.#manifest.layoutId, fingerprint: this.#manifest.fingerprint, rootKey,
      requiredContinuousSlots: Object.freeze(required.continuous),
      requiredNullableContinuousSlots: Object.freeze(required.nullableContinuous),
      requiredBooleanSlots: Object.freeze(required.booleans),
    });
    ROOT_COMPLETION_PLAN_INTERNALS.set(plan, { manifest: this.#manifest, operation });
    return plan;
  }

  /** Populate only the named fixed subtree after its model-owned scientific
   * admission. Proves shape/types and invariant labels before any write; does
   * not admit or promote sibling owners. Normal required-write promotion still
   * applies, and no temporary object becomes a second accepted authority. */
  completeCandidateRootFromObject(rootValue: unknown, plan: TransactionalTypedStateRootCompletionPlanV1): void {
    const internal = ROOT_COMPLETION_PLAN_INTERNALS.get(plan);
    if (!internal || internal.manifest !== this.#manifest || plan.layoutId !== this.#manifest.layoutId
      || plan.fingerprint !== this.#manifest.fingerprint) {
      throw new Error("Transactional typed state root completion plan has the wrong layout");
    }
    const generation = this.#candidateGeneration;
    this.assertCandidateGeneration(generation);
    // The cursor is private to this synchronous call; checks cannot retain it.
    const cursor: TransactionalTypedStateCandidateCursorV1 = {
      layoutId: this.#manifest.layoutId, fingerprint: this.#manifest.fingerprint,
      readContinuous: index => this.readCandidateContinuous(generation, index),
      writeContinuous: (index, value) => this.writeCandidateContinuous(generation, index, value),
      readNullableContinuous: index => this.readCandidateNullableContinuous(generation, index),
      writeNullableContinuous: (index, value) => this.writeCandidateNullableContinuous(generation, index, value),
      readBoolean: index => this.readCandidateBoolean(generation, index),
      writeBoolean: (index, value) => this.writeCandidateBoolean(generation, index, value),
      readString: index => {
        const accepted = this.readCurrentString(index);
        if (this.readCandidateString(generation, index) !== accepted) {
          throw new Error("Transactional typed state fixed root invariant string was changed");
        }
        return accepted;
      },
      writeStringSameByteLength: (index, value) => this.writeCandidateStringSameByteLength(generation, index, value),
    };
    internal.operation.check(rootValue, cursor);
    internal.operation.write(rootValue, cursor);
  }

  /**
   * Compiles the exact slots a model-owned direct transaction must write.
   * The WeakMap binding makes a structurally copied or hand-built plan
   * unusable, just like the completion plan above.
   */
  createPromotionPlan(
    required: TransactionalTypedStateRequiredWritesV1,
  ): TransactionalTypedStatePromotionPlanV1 {
    const requiredContinuous = requiredSlotIndices(
      required.continuous,
      this.#manifest.numericalLayout.continuousSlots.length,
      "continuous",
    );
    const requiredNullableContinuous = requiredSlotIndices(
      required.nullableContinuous,
      this.#manifest.numericalLayout.nullableContinuousSlots.length,
      "nullable continuous",
    );
    const requiredBooleans = requiredSlotIndices(
      required.booleans,
      this.#manifest.numericalLayout.booleanSlots.length,
      "boolean",
    );
    const requiredStrings = requiredSlotIndices(
      required.strings,
      this.#manifest.numericalLayout.stringSlots.length,
      "string",
    );
    const plan = Object.freeze({
      schemaId: TRANSACTIONAL_TYPED_STATE_PROMOTION_PLAN_V1_SCHEMA_ID,
      layoutId: this.#manifest.layoutId,
      fingerprint: this.#manifest.fingerprint,
      requiredContinuousSlots: requiredContinuous,
      requiredNullableContinuousSlots: requiredNullableContinuous,
      requiredBooleanSlots: requiredBooleans,
      requiredStringSlots: requiredStrings,
    });
    PROMOTION_PLAN_INTERNALS.set(plan, Object.freeze({
      manifest: this.#manifest,
      requiredContinuous,
      requiredNullableContinuous,
      requiredBooleans,
      requiredStrings,
    }));
    return plan;
  }

  /**
   * Promotes one model-owned candidate without constructing an object mirror.
   * This primitive proves transaction/layout identity and exhaustive writes
   * for the model-declared owner set only. The caller remains responsible for
   * all numerical, cross-owner, and accepted-boundary scientific seals before
   * invoking it. Failure leaves the inactive candidate staged for explicit
   * abort; success is the single infallible active-image swap.
   */
  promoteCandidateWithRequiredWrites(
    promotionPlan: TransactionalTypedStatePromotionPlanV1,
  ): void {
    if (!this.#staged) {
      throw new Error("Transactional typed state has no staged candidate");
    }
    this.assertPromotionPlanRequiredWrites(promotionPlan);
    this.promote();
    this.#modelOwnedPromotionCount += 1;
  }

  /**
   * Seals and promotes one model-owned typed candidate. The common lean path
   * validates the already model-admitted object identity and explicit slot
   * coverage without comparing it leaf-by-leaf with the image. Full-invariant
   * callers additionally pass an audit plan; a mismatch then leaves the
   * candidate staged so exhaustive event-boundary completion can take over.
   */
  tryPromoteCandidateWithRequiredWrites(
    candidate: TState,
    promotionPlan: TransactionalTypedStatePromotionPlanV1,
    exactAuditPlan?: TransactionalTypedStateCompletionPlanV1,
  ): TState | null {
    if (!this.#staged) {
      throw new Error("Transactional typed state has no staged candidate");
    }
    const admittedCandidate = this.#admitDirectCompletionCandidate === null
      ? candidate
      : this.#admitDirectCompletionCandidate(candidate);
    if (admittedCandidate !== candidate) {
      throw new Error(
        "Transactional typed state direct admission changed candidate identity",
      );
    }
    this.assertPromotionPlanRequiredWrites(promotionPlan);
    if (exactAuditPlan !== undefined) {
      const audit = COMPLETION_PLAN_INTERNALS.get(exactAuditPlan);
      if (
        audit === undefined
        || audit.manifest !== this.#manifest
        || exactAuditPlan.layoutId !== this.#manifest.layoutId
        || exactAuditPlan.fingerprint !== this.#manifest.fingerprint
      ) {
        throw new Error(
          "Transactional typed state exact audit plan has the wrong layout",
        );
      }
      const candidateImage = this.#images[this.inactiveIndex()];
      this.assertExternalImmutableRootsMatch(
        candidate,
        audit.readers.externalImmutable,
        candidateImage,
      );
      if (!imageExactlyMatchesObject(
        this.#manifest,
        candidate,
        candidateImage,
        audit.readers,
        this.#stagedStringBytes,
        this.#stagedDynamicBytes,
      )) {
        return null;
      }
      this.#directExactCandidateMatchCount += 1;
    }
    this.promote();
    this.#modelOwnedPromotionCount += 1;
    return admittedCandidate;
  }

  /**
   * Completes a directly staged candidate from a temporary object adapter.
   * Slots already written by migrated owners are compared bit-exactly and are
   * never overwritten; all remaining leaves and bounded arenas are populated
   * from the adapter. After this returns, the staged image is an exhaustive
   * typed encoding of the adapter: retained leaves matched bit-exactly and all
   * other admitted leaves were overwritten from it.
   */
  completeCandidateFromObject(
    candidate: TState,
    plan: TransactionalTypedStateCompletionPlanV1,
  ): TState {
    if (!this.#staged) {
      throw new Error("Transactional typed state has no staged candidate");
    }
    const admittedCandidate = this.#admitDirectCompletionCandidate === null
      ? candidate
      : this.#admitDirectCompletionCandidate(candidate);
    if (admittedCandidate !== candidate) {
      throw new Error(
        "Transactional typed state direct admission changed candidate identity",
      );
    }
    const internal = COMPLETION_PLAN_INTERNALS.get(plan);
    if (
      internal === undefined
      || internal.manifest !== this.#manifest
      || plan.layoutId !== this.#manifest.layoutId
      || plan.fingerprint !== this.#manifest.fingerprint
    ) {
      throw new Error(
        "Transactional typed state completion plan has the wrong layout",
      );
    }
    const candidateImage = this.#images[this.inactiveIndex()];
    const directReaders = this.#admitDirectCompletionCandidate === null
      ? undefined
      : internal.readers;
    if (directReaders === undefined) {
      this.assertExternalImmutableRootsMatch(candidate);
      assertFlatNumericalStateShapeV1(
        this.#manifest.numericalLayout,
        candidate,
      );
    }
    writeOptionalRecordPresence(
      this.#manifest,
      candidate,
      candidateImage,
      directReaders?.optionalRecords,
    );
    writeBoundedArrayLengths(
      this.#manifest,
      candidate,
      candidateImage,
      directReaders?.boundedArrays,
    );
    if (directReaders !== undefined) {
      this.assertExternalImmutableRootsMatch(
        candidate,
        directReaders.externalImmutable,
        candidateImage,
      );
    }
    assertRetainedFixedLeavesMatch(
      this.#manifest,
      candidate,
      candidateImage,
      internal.retainedContinuous,
      internal.retainedBooleans,
      directReaders,
    );
    writeFixedLeaves(
      this.#manifest,
      candidate,
      candidateImage,
      internal.writableContinuous,
      internal.writableBooleans,
      directReaders,
    );
    writeNullableContinuousLeaves(
      this.#manifest,
      candidate,
      candidateImage,
      directReaders,
    );
    this.#stagedStringBytes = writeStrings(
      this.#manifest,
      candidate,
      candidateImage,
      directReaders,
    );
    this.#stagedDynamicBytes = writeDynamicRoots(
      this.#manifest,
      candidate,
      candidateImage,
      directReaders,
    );
    if (directReaders !== undefined) {
      this.#directCompletionReaderPlanUseCount += 1;
    }
    return admittedCandidate;
  }

  /**
   * Proves that every staged byte already represents one internally admitted
   * adapter. No candidate data is written here. A mismatch returns null and
   * leaves the transaction open so the caller may run exhaustive completion.
   */
  matchCandidateExactlyAgainstObject(
    candidate: TState,
    plan: TransactionalTypedStateCompletionPlanV1,
  ): TState | null {
    if (!this.#staged) {
      throw new Error("Transactional typed state has no staged candidate");
    }
    const admittedCandidate = this.#admitDirectCompletionCandidate === null
      ? candidate
      : this.#admitDirectCompletionCandidate(candidate);
    if (admittedCandidate !== candidate) {
      throw new Error(
        "Transactional typed state direct admission changed candidate identity",
      );
    }
    const internal = COMPLETION_PLAN_INTERNALS.get(plan);
    if (
      internal === undefined
      || internal.manifest !== this.#manifest
      || plan.layoutId !== this.#manifest.layoutId
      || plan.fingerprint !== this.#manifest.fingerprint
    ) {
      throw new Error(
        "Transactional typed state completion plan has the wrong layout",
      );
    }
    const candidateImage = this.#images[this.inactiveIndex()];
    this.assertExternalImmutableRootsMatch(
      candidate,
      internal.readers.externalImmutable,
      candidateImage,
    );
    if (!imageExactlyMatchesObject(
      this.#manifest,
      candidate,
      candidateImage,
      internal.readers,
      this.#stagedStringBytes,
      this.#stagedDynamicBytes,
    )) {
      return null;
    }
    this.#directExactCandidateMatchCount += 1;
    return admittedCandidate;
  }

  promote(): void {
    if (!this.#staged) {
      throw new Error("Transactional typed state has no staged candidate");
    }
    this.#activeIndex = this.inactiveIndex();
    this.#currentStringBytes = this.#stagedStringBytes;
    this.#currentDynamicBytes = this.#stagedDynamicBytes;
    this.#highWaterStringBytes = Math.max(
      this.#highWaterStringBytes,
      this.#currentStringBytes,
    );
    this.#highWaterDynamicBytes = Math.max(
      this.#highWaterDynamicBytes,
      this.#currentDynamicBytes,
    );
    const currentLengths = this.#images[this.#activeIndex].boundedArrayLengths;
    for (let index = 0; index < currentLengths.length; index += 1) {
      this.#highWaterBoundedArrayLengths[index] = Math.max(
        this.#highWaterBoundedArrayLengths[index]!,
        currentLengths[index]!,
      );
    }
    this.#staged = false;
    this.#commitCount += 1;
  }

  abort(): void {
    this.#staged = false;
    this.#stagedStringBytes = 0;
    this.#stagedDynamicBytes = 0;
  }

  rehydrateCurrent(): TState {
    return rehydrateNode(
      this.#manifest.rootNode,
      this.#images[this.#activeIndex],
      this.#manifest.externalImmutableRoots,
    ) as TState;
  }

  /** Read one root without reconstructing its siblings. Mutable numerical
   * arrays remain detached; declared immutable constants retain their binding. */
  rehydrateCurrentRoot<TKey extends keyof TState & string>(rootKey: TKey): TState[TKey] {
    const root = this.#manifest.rootNode;
    if (root.kind !== "record") {
      throw new Error("Transactional typed state root is not a record");
    }
    const entry = root.entries.find(candidate => candidate.key === rootKey);
    if (entry === undefined) {
      throw new Error(`Transactional typed state root ${rootKey} is unavailable`);
    }
    return rehydrateNode(
      entry.node,
      this.#images[this.#activeIndex],
      this.#manifest.externalImmutableRoots,
    ) as TState[TKey];
  }

  /** Bind a declared record path once. Every invocation reads this authority's
   * current accepted image and returns the usual detached subtree, never a
   * live view or a candidate borrow. Promotion cannot change earlier results. */
  createCurrentSubtreeReader<const TPath extends readonly string[]>(
    path: TPath,
  ): () => TypedStateSubtreeValueV1<TState, TPath> {
    if (!Array.isArray(path) || path.length === 0) {
      throw new Error("Transactional typed state subtree path is empty or invalid");
    }
    let node = this.#manifest.rootNode;
    for (const key of path) {
      if (typeof key !== "string" || node.kind !== "record") {
        throw new Error("Transactional typed state subtree path crosses a non-record node");
      }
      const entry = node.entries.find(candidate => candidate.key === key);
      if (entry === undefined) {
        throw new Error(`Transactional typed state subtree ${key} is unavailable`);
      }
      node = entry.node;
    }
    const boundNode = node;
    return () => rehydrateNode(boundNode, this.#images[this.#activeIndex],
      this.#manifest.externalImmutableRoots) as TypedStateSubtreeValueV1<TState, TPath>;
  }

  rehydrateStaged(): TState {
    if (!this.#staged) {
      throw new Error("Transactional typed state has no staged candidate");
    }
    return rehydrateNode(
      this.#manifest.rootNode,
      this.#images[this.inactiveIndex()],
      this.#manifest.externalImmutableRoots,
    ) as TState;
  }

  currentCursor(): TransactionalTypedStateCurrentCursorV1 {
    return this.#currentCursor;
  }

  snapshot(): TransactionalTypedStateImageSnapshotV1 {
    const image = this.#images[this.#activeIndex];
    return Object.freeze({
      continuous: image.continuous.slice(),
      nullableContinuous: image.nullableContinuous.slice(),
      nullableContinuousPresent: image.nullableContinuousPresent.slice(),
      booleans: image.booleans.slice(),
      stringMetadata: image.stringMetadata.slice(),
      nullableStringMetadata: image.nullableStringMetadata.slice(),
      nullableStringPresent: image.nullableStringPresent.slice(),
      optionalRecordPresent: image.optionalRecordPresent.slice(),
      boundedArrayLengths: image.boundedArrayLengths.slice(),
      stringBytes: image.stringArena.slice(0, this.#currentStringBytes),
      dynamicMetadata: image.dynamicMetadata.slice(),
      dynamicBytes: image.dynamicArena.slice(0, this.#currentDynamicBytes),
    });
  }

  report(): TransactionalTypedStateImageReportV1 {
    const layout = this.#manifest.numericalLayout;
    return Object.freeze({
      authorityId: TRANSACTIONAL_TYPED_STATE_IMAGE_V1_ID,
      layoutId: this.#manifest.layoutId,
      fingerprint: this.#manifest.fingerprint,
      continuousSlotCount: layout.continuousSlots.length,
      nullableContinuousSlotCount: layout.nullableContinuousSlots.length,
      nullableStringSlotCount: layout.nullableStringSlots.length,
      optionalRecordRootCount: layout.optionalRecordRoots.length,
      boundedArrayRootCount: layout.boundedArrayRoots.length,
      booleanSlotCount: layout.booleanSlots.length,
      stringSlotCount: layout.stringSlots.length,
      dynamicRootCount: layout.excludedDynamicRoots.length,
      externalImmutableRootCount: layout.externalImmutableRoots.length,
      containerCount: layout.containers.length,
      fixedImageCount: 2 as const,
      bufferByteLength: this.#manifest.bufferByteLength,
      stringArenaCapacityBytes: this.#manifest.stringArenaCapacityBytes,
      dynamicArenaCapacityBytes: this.#manifest.dynamicArenaCapacityBytes,
      currentStringBytes: this.#currentStringBytes,
      currentDynamicBytes: this.#currentDynamicBytes,
      highWaterStringBytes: this.#highWaterStringBytes,
      highWaterDynamicBytes: this.#highWaterDynamicBytes,
      boundedArrays: Object.freeze(layout.boundedArrayRoots.map((root, index) =>
        Object.freeze({
          pointer: root.pointer,
          capacity: root.capacity,
          currentLength:
            this.#images[this.#activeIndex].boundedArrayLengths[index]!,
          highWaterLength: this.#highWaterBoundedArrayLengths[index]!,
        }))),
      activeBufferIndex: this.#activeIndex,
      commitCount: this.#commitCount,
      externalImmutableIdentityMatchCount:
        this.#externalImmutableIdentityMatchCount,
      externalImmutableCanonicalMatchCount:
        this.#externalImmutableCanonicalMatchCount,
      directCompletionReaderPlanUseCount:
        this.#directCompletionReaderPlanUseCount,
      directExactCandidateMatchCount: this.#directExactCandidateMatchCount,
      modelOwnedPromotionCount: this.#modelOwnedPromotionCount,
      staged: this.#staged,
    });
  }

  private assertExternalImmutableRootsMatch(
    candidate: TState,
    directReaders?: readonly DirectPathReaderV1[],
    candidateImage?: MutableImageV1,
  ): void {
    const expectedBytes = EXTERNAL_IMMUTABLE_CANONICAL_BYTES.get(
      this.#manifest,
    );
    if (expectedBytes === undefined) {
      throw new Error(
        "Transactional typed state external immutable manifest is unavailable",
      );
    }
    let identityMatches = 0;
    let canonicalMatches = 0;
    for (
      let index = 0;
      index < this.#manifest.externalImmutableRoots.length;
      index += 1
    ) {
      const expected = this.#manifest.externalImmutableRoots[index]!;
      if (layoutEntryAbsent(
        this.#manifest.numericalLayout,
        candidate,
        this.#manifest.numericalLayout.externalImmutableRoots[index]!,
        candidateImage,
      )) {
        continue;
      }
      const actual = directReaders === undefined
        ? readFlatNumericalStatePathV1(candidate, expected.path)
        : directReaders[index]!(candidate);
      if (actual === expected.value) {
        identityMatches += 1;
        continue;
      }
      assertTransitivelyFrozenData(actual, expected.pointer, new Set<object>());
      const actualBytes = encodeCanonicalBytes(actual);
      const referenceBytes = expectedBytes[index]!;
      if (
        actualBytes.byteLength !== referenceBytes.byteLength
        || !actualBytes.every((value, byteIndex) =>
          value === referenceBytes[byteIndex])
      ) {
        throw new Error(
          `Transactional typed state external immutable ${expected.pointer} changed`,
        );
      }
      canonicalMatches += 1;
    }
    this.#externalImmutableIdentityMatchCount += identityMatches;
    this.#externalImmutableCanonicalMatchCount += canonicalMatches;
  }

  private inactiveIndex(): 0 | 1 {
    return this.#activeIndex === 0 ? 1 : 0;
  }

  private readCurrentContinuous(slotIndex: number): number {
    assertSlotIndex(
      slotIndex,
      this.#manifest.numericalLayout.continuousSlots.length,
      "continuous",
    );
    const value = this.#images[this.#activeIndex].continuous[slotIndex]!;
    if (!Number.isFinite(value)) {
      throw new Error("Transactional typed state current continuous slot is not finite");
    }
    return value;
  }

  private readCurrentNullableContinuous(slotIndex: number): number | null {
    assertSlotIndex(
      slotIndex,
      this.#manifest.numericalLayout.nullableContinuousSlots.length,
      "nullable continuous",
    );
    const image = this.#images[this.#activeIndex];
    const present = image.nullableContinuousPresent[slotIndex]!;
    if (present === 0) return null;
    if (present !== 1) {
      throw new Error(
        "Transactional typed state nullable continuous presence is invalid",
      );
    }
    const value = image.nullableContinuous[slotIndex]!;
    if (!Number.isFinite(value)) {
      throw new Error(
        "Transactional typed state nullable continuous slot is not finite",
      );
    }
    return value;
  }

  private readCurrentBoolean(slotIndex: number): boolean {
    assertSlotIndex(
      slotIndex,
      this.#manifest.numericalLayout.booleanSlots.length,
      "boolean",
    );
    const value = this.#images[this.#activeIndex].booleans[slotIndex]!;
    if (value !== 0 && value !== 1) {
      throw new Error("Transactional typed state current boolean slot is invalid");
    }
    return value === 1;
  }

  private readCurrentNullableString(slotIndex: number): string | null {
    assertSlotIndex(
      slotIndex,
      this.#manifest.numericalLayout.nullableStringSlots.length,
      "nullable string",
    );
    const image = this.#images[this.#activeIndex];
    const present = image.nullableStringPresent[slotIndex]!;
    if (present === 0) return null;
    if (present !== 1) {
      throw new Error(
        "Transactional typed state nullable string presence is invalid",
      );
    }
    const offset = image.nullableStringMetadata[slotIndex * 2]!;
    const length = image.nullableStringMetadata[slotIndex * 2 + 1]!;
    assertArenaSlice(offset, length, this.#currentStringBytes, "string", true);
    return UTF8_DECODER.decode(
      image.stringArena.subarray(offset, offset + length),
    );
  }

  private readCurrentString(slotIndex: number): string {
    assertSlotIndex(
      slotIndex,
      this.#manifest.numericalLayout.stringSlots.length,
      "string",
    );
    const image = this.#images[this.#activeIndex];
    const offset = image.stringMetadata[slotIndex * 2]!;
    const length = image.stringMetadata[slotIndex * 2 + 1]!;
    assertArenaSlice(offset, length, this.#currentStringBytes, "string", true);
    return UTF8_DECODER.decode(image.stringArena.subarray(offset, offset + length));
  }

  private readCurrentDynamic(slotIndex: number): unknown {
    assertSlotIndex(
      slotIndex,
      this.#manifest.numericalLayout.excludedDynamicRoots.length,
      "dynamic",
    );
    const image = this.#images[this.#activeIndex];
    const offset = image.dynamicMetadata[slotIndex * 2]!;
    const length = image.dynamicMetadata[slotIndex * 2 + 1]!;
    assertArenaSlice(offset, length, this.#currentDynamicBytes, "dynamic");
    return decodeCanonicalFlatDataV1(
      image.dynamicArena.subarray(offset, offset + length),
    );
  }

  private readCurrentBoundedArray(slotIndex: number): readonly unknown[] {
    assertSlotIndex(
      slotIndex,
      this.#manifest.boundedArrayNodes.length,
      "bounded array",
    );
    return rehydrateNode(
      this.#manifest.boundedArrayNodes[slotIndex]!,
      this.#images[this.#activeIndex],
      this.#manifest.externalImmutableRoots,
    ) as readonly unknown[];
  }

  private readCandidateContinuous(
    generation: number,
    slotIndex: number,
  ): number {
    this.assertCandidateGeneration(generation);
    assertSlotIndex(
      slotIndex,
      this.#manifest.numericalLayout.continuousSlots.length,
      "continuous candidate",
    );
    return this.#images[this.inactiveIndex()].continuous[slotIndex]!;
  }

  private writeCandidateContinuous(
    generation: number,
    slotIndex: number,
    value: number,
  ): void {
    this.assertCandidateGeneration(generation);
    assertSlotIndex(
      slotIndex,
      this.#manifest.numericalLayout.continuousSlots.length,
      "continuous candidate",
    );
    if (!Number.isFinite(value)) {
      throw new Error(
        "Transactional typed state candidate continuous value must be finite",
      );
    }
    this.#images[this.inactiveIndex()].continuous[slotIndex] = value;
    this.#candidateWrittenContinuous[slotIndex] = 1;
  }

  private readCandidateNullableContinuous(
    generation: number,
    slotIndex: number,
  ): number | null {
    this.assertCandidateGeneration(generation);
    assertSlotIndex(
      slotIndex,
      this.#manifest.numericalLayout.nullableContinuousSlots.length,
      "nullable continuous candidate",
    );
    const image = this.#images[this.inactiveIndex()];
    const present = image.nullableContinuousPresent[slotIndex]!;
    if (present === 0) return null;
    if (present !== 1 || !Number.isFinite(image.nullableContinuous[slotIndex])) {
      throw new Error(
        "Transactional typed state nullable continuous candidate is invalid",
      );
    }
    return image.nullableContinuous[slotIndex]!;
  }

  private writeCandidateNullableContinuous(
    generation: number,
    slotIndex: number,
    value: number | null,
  ): void {
    this.assertCandidateGeneration(generation);
    assertSlotIndex(
      slotIndex,
      this.#manifest.numericalLayout.nullableContinuousSlots.length,
      "nullable continuous candidate",
    );
    const image = this.#images[this.inactiveIndex()];
    if (value === null) {
      image.nullableContinuous[slotIndex] = 0;
      image.nullableContinuousPresent[slotIndex] = 0;
      this.#candidateWrittenNullableContinuous[slotIndex] = 1;
      return;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        "Transactional typed state nullable continuous candidate value is invalid",
      );
    }
    image.nullableContinuous[slotIndex] = value;
    image.nullableContinuousPresent[slotIndex] = 1;
    this.#candidateWrittenNullableContinuous[slotIndex] = 1;
  }

  private readCandidateBoolean(
    generation: number,
    slotIndex: number,
  ): boolean {
    this.assertCandidateGeneration(generation);
    assertSlotIndex(
      slotIndex,
      this.#manifest.numericalLayout.booleanSlots.length,
      "boolean candidate",
    );
    return this.#images[this.inactiveIndex()].booleans[slotIndex] === 1;
  }

  private writeCandidateBoolean(
    generation: number,
    slotIndex: number,
    value: boolean,
  ): void {
    this.assertCandidateGeneration(generation);
    assertSlotIndex(
      slotIndex,
      this.#manifest.numericalLayout.booleanSlots.length,
      "boolean candidate",
    );
    if (typeof value !== "boolean") {
      throw new Error(
        "Transactional typed state candidate boolean value must be boolean",
      );
    }
    this.#images[this.inactiveIndex()].booleans[slotIndex] = value ? 1 : 0;
    this.#candidateWrittenBooleans[slotIndex] = 1;
  }

  private readCandidateString(
    generation: number,
    slotIndex: number,
  ): string {
    this.assertCandidateGeneration(generation);
    assertSlotIndex(
      slotIndex,
      this.#manifest.numericalLayout.stringSlots.length,
      "string candidate",
    );
    return decodeStringSlot(
      this.#images[this.inactiveIndex()],
      slotIndex,
      this.#stagedStringBytes,
    );
  }

  private writeCandidateStringSameByteLength(
    generation: number,
    slotIndex: number,
    value: string,
  ): void {
    this.assertCandidateGeneration(generation);
    assertSlotIndex(
      slotIndex,
      this.#manifest.numericalLayout.stringSlots.length,
      "string candidate",
    );
    assertWellFormedString(value, "candidate string");
    const image = this.#images[this.inactiveIndex()];
    const offset = image.stringMetadata[slotIndex * 2]!;
    const length = image.stringMetadata[slotIndex * 2 + 1]!;
    assertArenaSlice(
      offset,
      length,
      this.#stagedStringBytes,
      "string candidate",
      true,
    );
    const target = image.stringArena.subarray(offset, offset + length);
    const result = UTF8_ENCODER.encodeInto(value, target);
    if (result.read !== value.length || result.written !== length) {
      throw new Error(
        "Transactional typed state candidate string byte length changed",
      );
    }
    this.#candidateWrittenStrings[slotIndex] = 1;
  }

  private assertCandidateGeneration(generation: number): void {
    if (!this.#staged || generation !== this.#candidateGeneration) {
      throw new Error("Transactional typed state candidate cursor is stale");
    }
  }

  private assertPromotionPlanRequiredWrites(
    promotionPlan: TransactionalTypedStatePromotionPlanV1,
  ): void {
    const internal = PROMOTION_PLAN_INTERNALS.get(promotionPlan);
    if (
      internal === undefined
      || internal.manifest !== this.#manifest
      || promotionPlan.layoutId !== this.#manifest.layoutId
      || promotionPlan.fingerprint !== this.#manifest.fingerprint
    ) {
      throw new Error(
        "Transactional typed state promotion plan has the wrong layout",
      );
    }
    assertRequiredCandidateWrites(
      internal.requiredContinuous,
      this.#candidateWrittenContinuous,
      "continuous",
    );
    assertRequiredCandidateWrites(
      internal.requiredNullableContinuous,
      this.#candidateWrittenNullableContinuous,
      "nullable continuous",
    );
    assertRequiredCandidateWrites(
      internal.requiredBooleans,
      this.#candidateWrittenBooleans,
      "boolean",
    );
    assertRequiredCandidateWrites(
      internal.requiredStrings,
      this.#candidateWrittenStrings,
      "string",
    );
  }
}

function assertSlotIndex(
  slotIndex: number,
  slotCount: number,
  owner: string,
): void {
  if (
    !Number.isSafeInteger(slotIndex)
    || slotIndex < 0
    || slotIndex >= slotCount
  ) {
    throw new Error(`Transactional typed state ${owner} slot index is invalid`);
  }
}

function assertArenaSlice(
  offset: number,
  length: number,
  usedBytes: number,
  owner: string,
  allowEmpty = false,
): void {
  if (
    !Number.isSafeInteger(offset)
    || !Number.isSafeInteger(length)
    || offset < 0
    || length < (allowEmpty ? 0 : 1)
    || offset + length > usedBytes
  ) {
    throw new Error(`Transactional typed state current ${owner} slice is invalid`);
  }
}

function writeFixedLeaves(
  manifest: TransactionalTypedStateManifestV1,
  state: unknown,
  destination: MutableImageV1,
  writableContinuous?: readonly number[],
  writableBooleans?: readonly number[],
  directReaders?: DirectCompletionReadersV1,
): void {
  const layout = manifest.numericalLayout;
  const continuousCount = writableContinuous?.length
    ?? layout.continuousSlots.length;
  for (let position = 0; position < continuousCount; position += 1) {
    const index = writableContinuous?.[position] ?? position;
    const slot = layout.continuousSlots[index]!;
    if (layoutEntryAbsent(layout, state, slot, directReaders === undefined
      ? undefined
      : destination)) {
      destination.continuous[index] = 0;
      continue;
    }
    const value = directReaders?.continuous[index]?.(state)
      ?? readFlatNumericalStatePathV1(state, slot.path);
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Transactional typed state ${slot.pointer} must be finite`);
    }
    destination.continuous[index] = value;
  }
  const booleanCount = writableBooleans?.length ?? layout.booleanSlots.length;
  for (let position = 0; position < booleanCount; position += 1) {
    const index = writableBooleans?.[position] ?? position;
    const slot = layout.booleanSlots[index]!;
    if (layoutEntryAbsent(layout, state, slot, directReaders === undefined
      ? undefined
      : destination)) {
      destination.booleans[index] = 0;
      continue;
    }
    const value = directReaders?.booleans[index]?.(state)
      ?? readFlatNumericalStatePathV1(state, slot.path);
    if (typeof value !== "boolean") {
      throw new Error(`Transactional typed state ${slot.pointer} must be boolean`);
    }
    destination.booleans[index] = value ? 1 : 0;
  }
}

function assertRetainedFixedLeavesMatch(
  manifest: TransactionalTypedStateManifestV1,
  state: unknown,
  destination: MutableImageV1,
  retainedContinuous: ReadonlySet<number>,
  retainedBooleans: ReadonlySet<number>,
  directReaders?: DirectCompletionReadersV1,
): void {
  for (const index of retainedContinuous) {
    const slot = manifest.numericalLayout.continuousSlots[index]!;
    const value = directReaders?.continuous[index]?.(state)
      ?? readFlatNumericalStatePathV1(state, slot.path);
    if (
      typeof value !== "number"
      || !Number.isFinite(value)
      || !Object.is(destination.continuous[index], value)
    ) {
      throw new Error(
        `Transactional typed state retained ${slot.pointer} differs from adapter`,
      );
    }
  }
  for (const index of retainedBooleans) {
    const slot = manifest.numericalLayout.booleanSlots[index]!;
    const value = directReaders?.booleans[index]?.(state)
      ?? readFlatNumericalStatePathV1(state, slot.path);
    if (
      typeof value !== "boolean"
      || destination.booleans[index] !== (value ? 1 : 0)
    ) {
      throw new Error(
        `Transactional typed state retained ${slot.pointer} differs from adapter`,
      );
    }
  }
}

function imageExactlyMatchesObject(
  manifest: TransactionalTypedStateManifestV1,
  state: unknown,
  image: MutableImageV1,
  readers: DirectCompletionReadersV1,
  stringBytes: number,
  dynamicBytes: number,
): boolean {
  const layout = manifest.numericalLayout;
  for (let index = 0; index < layout.optionalRecordRoots.length; index += 1) {
    const present = readers.optionalRecords[index]!(state) !== null;
    if (image.optionalRecordPresent[index] !== (present ? 1 : 0)) return false;
  }
  for (let index = 0; index < layout.boundedArrayRoots.length; index += 1) {
    const value = readers.boundedArrays[index]!(state);
    if (
      !Array.isArray(value)
      || value.length !== image.boundedArrayLengths[index]
    ) return false;
  }
  for (let index = 0; index < layout.continuousSlots.length; index += 1) {
    const slot = layout.continuousSlots[index]!;
    if (layoutEntryAbsent(layout, state, slot, image)) continue;
    const value = readers.continuous[index]!(state);
    if (
      typeof value !== "number"
      || !Number.isFinite(value)
      || !Object.is(image.continuous[index], value)
    ) return false;
  }
  for (
    let index = 0;
    index < layout.nullableContinuousSlots.length;
    index += 1
  ) {
    const slot = layout.nullableContinuousSlots[index]!;
    if (layoutEntryAbsent(layout, state, slot, image)) continue;
    const value = readers.nullableContinuous[index]!(state);
    const present = image.nullableContinuousPresent[index]!;
    if (value === null) {
      if (present !== 0) return false;
      continue;
    }
    if (
      typeof value !== "number"
      || !Number.isFinite(value)
      || present !== 1
      || !Object.is(image.nullableContinuous[index], value)
    ) return false;
  }
  for (let index = 0; index < layout.booleanSlots.length; index += 1) {
    const slot = layout.booleanSlots[index]!;
    if (layoutEntryAbsent(layout, state, slot, image)) continue;
    const value = readers.booleans[index]!(state);
    if (
      typeof value !== "boolean"
      || image.booleans[index] !== (value ? 1 : 0)
    ) return false;
  }
  for (let index = 0; index < layout.stringSlots.length; index += 1) {
    const slot = layout.stringSlots[index]!;
    if (layoutEntryAbsent(layout, state, slot, image)) continue;
    const value = readers.strings[index]!(state);
    if (
      typeof value !== "string"
      || decodeStringSlot(image, index, stringBytes) !== value
    ) return false;
  }
  for (
    let index = 0;
    index < layout.nullableStringSlots.length;
    index += 1
  ) {
    const slot = layout.nullableStringSlots[index]!;
    if (layoutEntryAbsent(layout, state, slot, image)) continue;
    const value = readers.nullableStrings[index]!(state);
    const present = image.nullableStringPresent[index]!;
    if (value === null) {
      if (present !== 0) return false;
      continue;
    }
    if (typeof value !== "string" || present !== 1) return false;
    const offset = image.nullableStringMetadata[index * 2]!;
    const length = image.nullableStringMetadata[index * 2 + 1]!;
    assertArenaSlice(offset, length, stringBytes, "nullable string", true);
    if (
      UTF8_DECODER.decode(image.stringArena.subarray(offset, offset + length))
        !== value
    ) return false;
  }
  for (let index = 0; index < layout.excludedDynamicRoots.length; index += 1) {
    const slot = layout.excludedDynamicRoots[index]!;
    if (layoutEntryAbsent(layout, state, slot, image)) continue;
    const value = readers.dynamicRoots[index]!(state);
    const expectedLength = measureCanonicalFlatDataV1(value);
    const offset = image.dynamicMetadata[index * 2]!;
    const length = image.dynamicMetadata[index * 2 + 1]!;
    if (length !== expectedLength) return false;
    assertArenaSlice(offset, length, dynamicBytes, "dynamic");
    const expected = new Uint8Array(expectedLength);
    if (encodeCanonicalFlatDataIntoV1(value, expected) !== expectedLength) {
      throw new Error("Transactional typed state dynamic length changed");
    }
    const actual = image.dynamicArena.subarray(offset, offset + length);
    if (!expected.every((byte, byteIndex) => byte === actual[byteIndex])) {
      return false;
    }
  }
  return true;
}

function decodeStringSlot(
  image: MutableImageV1,
  slotIndex: number,
  usedBytes: number,
): string {
  const offset = image.stringMetadata[slotIndex * 2]!;
  const length = image.stringMetadata[slotIndex * 2 + 1]!;
  assertArenaSlice(offset, length, usedBytes, "string", true);
  return UTF8_DECODER.decode(image.stringArena.subarray(offset, offset + length));
}

function retainedSlotSet(
  slots: readonly number[] | undefined,
  slotCount: number,
  owner: string,
): ReadonlySet<number> {
  const retained = new Set<number>();
  for (const slotIndex of slots ?? []) {
    assertSlotIndex(slotIndex, slotCount, `${owner} retained`);
    if (retained.has(slotIndex)) {
      throw new Error(
        `Transactional typed state ${owner} retained slot is duplicated`,
      );
    }
    retained.add(slotIndex);
  }
  return retained;
}

function requiredSlotIndices(
  slots: readonly number[] | undefined,
  slotCount: number,
  owner: string,
): readonly number[] {
  const required = new Set<number>();
  for (const slotIndex of slots ?? []) {
    assertSlotIndex(slotIndex, slotCount, `${owner} required`);
    if (required.has(slotIndex)) {
      throw new Error(
        `Transactional typed state ${owner} required slot is duplicated`,
      );
    }
    required.add(slotIndex);
  }
  return Object.freeze([...required]);
}

function assertRequiredCandidateWrites(
  requiredSlots: readonly number[],
  writtenSlots: Uint8Array,
  owner: string,
): void {
  for (const slotIndex of requiredSlots) {
    if (writtenSlots[slotIndex] !== 1) {
      throw new Error(
        `Transactional typed state required ${owner} slot ${slotIndex} `
          + "was not written in this candidate generation",
      );
    }
  }
}

function complementSlotIndices(
  slotCount: number,
  retained: ReadonlySet<number>,
): readonly number[] {
  const writable: number[] = [];
  for (let index = 0; index < slotCount; index += 1) {
    if (!retained.has(index)) writable.push(index);
  }
  return Object.freeze(writable);
}

/**
 * The model-owned direct-admission callback has already proved the complete
 * candidate synchronously. Compile its immutable topology once so completion
 * does not restart a descriptor-checked root walk for every individual leaf.
 * Generic staging and completion without that callback never use this plan.
 */
function compileDirectCompletionReaders(
  manifest: TransactionalTypedStateManifestV1,
): DirectCompletionReadersV1 {
  const readers = <T extends Readonly<{
    path: readonly FlatNumericalPathSegmentV1[];
  }>>(entries: readonly T[]): readonly DirectPathReaderV1[] =>
    Object.freeze(entries.map(({ path }) => compileDirectPathReader(path)));
  const layout = manifest.numericalLayout;
  return Object.freeze({
    externalImmutable: readers(layout.externalImmutableRoots),
    optionalRecords: readers(layout.optionalRecordRoots),
    boundedArrays: readers(layout.boundedArrayRoots),
    continuous: readers(layout.continuousSlots),
    nullableContinuous: readers(layout.nullableContinuousSlots),
    booleans: readers(layout.booleanSlots),
    strings: readers(layout.stringSlots),
    nullableStrings: readers(layout.nullableStringSlots),
    dynamicRoots: readers(layout.excludedDynamicRoots),
  });
}

function compileDirectPathReader(
  path: readonly FlatNumericalPathSegmentV1[],
): DirectPathReaderV1 {
  const segments = Object.freeze([...path]);
  return (root: unknown): unknown => {
    let current = root;
    for (const segment of segments) {
      current = (current as Record<PropertyKey, unknown>)[segment];
    }
    return current;
  };
}

function writeOptionalRecordPresence(
  manifest: TransactionalTypedStateManifestV1,
  state: unknown,
  destination: MutableImageV1,
  directReaders?: readonly DirectPathReaderV1[],
): void {
  for (
    let index = 0;
    index < manifest.numericalLayout.optionalRecordRoots.length;
    index += 1
  ) {
    const root = manifest.numericalLayout.optionalRecordRoots[index]!;
    const value = directReaders === undefined
      ? readFlatNumericalStatePathV1(state, root.path)
      : directReaders[index]!(state);
    destination.optionalRecordPresent[index] = value === null ? 0 : 1;
  }
}

function writeBoundedArrayLengths(
  manifest: TransactionalTypedStateManifestV1,
  state: unknown,
  destination: MutableImageV1,
  directReaders?: readonly DirectPathReaderV1[],
): void {
  for (
    let index = 0;
    index < manifest.numericalLayout.boundedArrayRoots.length;
    index += 1
  ) {
    const root = manifest.numericalLayout.boundedArrayRoots[index]!;
    const value = directReaders === undefined
      ? readFlatNumericalStatePathV1(state, root.path)
      : directReaders[index]!(state);
    if (!Array.isArray(value) || value.length > root.capacity) {
      throw new Error(
        `Transactional typed state ${root.pointer} exceeds bounded-array capacity`,
      );
    }
    destination.boundedArrayLengths[index] = value.length;
  }
}

function layoutEntryAbsent(
  layout: FlatNumericalStateLayoutV1,
  state: unknown,
  slot: FlatNumericalSlotV1,
  candidateImage?: MutableImageV1,
): boolean {
  if (slot.optionalRecordRootIndex !== null) {
    const root = layout.optionalRecordRoots[slot.optionalRecordRootIndex];
    if (root === undefined) {
      throw new Error("Transactional typed state optional-record slot owner is invalid");
    }
    if (candidateImage !== undefined) {
      if (
        candidateImage.optionalRecordPresent[
          slot.optionalRecordRootIndex
        ] === 0
      ) return true;
    } else if (
      readFlatNumericalStatePathV1(state, root.path) === null
    ) {
      return true;
    }
  }
  if (slot.boundedArrayRootIndex !== null) {
    const root = layout.boundedArrayRoots[slot.boundedArrayRootIndex];
    if (root === undefined || slot.boundedArrayItemIndex === null) {
      throw new Error("Transactional typed state bounded-array slot owner is invalid");
    }
    if (candidateImage !== undefined) {
      return slot.boundedArrayItemIndex
        >= candidateImage.boundedArrayLengths[slot.boundedArrayRootIndex]!;
    }
    const value = readFlatNumericalStatePathV1(state, root.path);
    if (!Array.isArray(value)) {
      throw new Error(
        `Transactional typed state ${root.pointer} must remain an array`,
      );
    }
    return slot.boundedArrayItemIndex >= value.length;
  }
  return false;
}

function writeNullableContinuousLeaves(
  manifest: TransactionalTypedStateManifestV1,
  state: unknown,
  destination: MutableImageV1,
  directReaders?: DirectCompletionReadersV1,
): void {
  const slots = manifest.numericalLayout.nullableContinuousSlots;
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index]!;
    if (layoutEntryAbsent(
      manifest.numericalLayout,
      state,
      slot,
      directReaders === undefined ? undefined : destination,
    )) {
      destination.nullableContinuous[index] = 0;
      destination.nullableContinuousPresent[index] = 0;
      continue;
    }
    const value = directReaders === undefined
      ? readFlatNumericalStatePathV1(state, slot.path)
      : directReaders.nullableContinuous[index]!(state);
    if (value === null) {
      destination.nullableContinuous[index] = 0;
      destination.nullableContinuousPresent[index] = 0;
      continue;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        `Transactional typed state ${slot.pointer} must be null or finite`,
      );
    }
    destination.nullableContinuous[index] = value;
    destination.nullableContinuousPresent[index] = 1;
  }
}

function writeStrings(
  manifest: TransactionalTypedStateManifestV1,
  state: unknown,
  destination: MutableImageV1,
  directReaders?: DirectCompletionReadersV1,
): number {
  let byteOffset = 0;
  for (
    let index = 0;
    index < manifest.numericalLayout.stringSlots.length;
    index += 1
  ) {
    const slot = manifest.numericalLayout.stringSlots[index]!;
    if (
      layoutEntryAbsent(
        manifest.numericalLayout,
        state,
        slot,
        directReaders === undefined ? undefined : destination,
      )
    ) {
      destination.stringMetadata[index * 2] = 0;
      destination.stringMetadata[index * 2 + 1] = 0;
      continue;
    }
    const value = directReaders?.strings[index]?.(state)
      ?? readFlatNumericalStatePathV1(state, slot.path);
    if (typeof value !== "string") {
      throw new Error(`Transactional typed state ${slot.pointer} must be a string`);
    }
    assertWellFormedString(value, slot.pointer);
    const target = destination.stringArena.subarray(byteOffset);
    const result = UTF8_ENCODER.encodeInto(value, target);
    if (result.read !== value.length) {
      throw new Error("Transactional typed state string arena capacity exceeded");
    }
    destination.stringMetadata[index * 2] = byteOffset;
    destination.stringMetadata[index * 2 + 1] = result.written;
    byteOffset += result.written;
  }
  for (
    let index = 0;
    index < manifest.numericalLayout.nullableStringSlots.length;
    index += 1
  ) {
    const slot = manifest.numericalLayout.nullableStringSlots[index]!;
    if (
      layoutEntryAbsent(
        manifest.numericalLayout,
        state,
        slot,
        directReaders === undefined ? undefined : destination,
      )
    ) {
      destination.nullableStringMetadata[index * 2] = 0;
      destination.nullableStringMetadata[index * 2 + 1] = 0;
      destination.nullableStringPresent[index] = 0;
      continue;
    }
    const value = directReaders === undefined
      ? readFlatNumericalStatePathV1(state, slot.path)
      : directReaders.nullableStrings[index]!(state);
    if (value === null) {
      destination.nullableStringMetadata[index * 2] = 0;
      destination.nullableStringMetadata[index * 2 + 1] = 0;
      destination.nullableStringPresent[index] = 0;
      continue;
    }
    if (typeof value !== "string") {
      throw new Error(
        `Transactional typed state ${slot.pointer} must be null or a string`,
      );
    }
    assertWellFormedString(value, slot.pointer);
    const target = destination.stringArena.subarray(byteOffset);
    const result = UTF8_ENCODER.encodeInto(value, target);
    if (result.read !== value.length) {
      throw new Error("Transactional typed state string arena capacity exceeded");
    }
    destination.nullableStringMetadata[index * 2] = byteOffset;
    destination.nullableStringMetadata[index * 2 + 1] = result.written;
    destination.nullableStringPresent[index] = 1;
    byteOffset += result.written;
  }
  return byteOffset;
}

function writeDynamicRoots(
  manifest: TransactionalTypedStateManifestV1,
  state: unknown,
  destination: MutableImageV1,
  directReaders?: DirectCompletionReadersV1,
): number {
  let byteOffset = 0;
  const roots = manifest.numericalLayout.excludedDynamicRoots;
  for (let index = 0; index < roots.length; index += 1) {
    const slot = roots[index]!;
    const value = layoutEntryAbsent(
      manifest.numericalLayout,
      state,
      slot,
      directReaders === undefined ? undefined : destination,
    )
      ? null
      : directReaders === undefined
        ? readFlatNumericalStatePathV1(state, slot.path)
        : directReaders.dynamicRoots[index]!(state);
    let length: number;
    try {
      length = encodeCanonicalFlatDataIntoV1(
        value,
        destination.dynamicArena.subarray(byteOffset),
      );
    } catch (error) {
      if (
        error instanceof Error
        && error.message === "Canonical flat data exceeds its fixed capacity"
      ) {
        throw new Error(
          "Transactional typed state dynamic arena capacity exceeded",
        );
      }
      throw error;
    }
    destination.dynamicMetadata[index * 2] = byteOffset;
    destination.dynamicMetadata[index * 2 + 1] = length;
    byteOffset += length;
  }
  return byteOffset;
}

function compileFixedRootCompletionV1(node: TypedStateNodeV1,
  required: { continuous: number[]; nullableContinuous: number[]; booleans: number[] }): RootCompletionOperationV1 {
  const invalid = () => { throw new Error("Transactional typed state fixed root shape or value differs"); };
  switch (node.kind) {
    case "f64":
      required.continuous.push(node.slotIndex);
      return { check(value) { if (typeof value !== "number" || !Number.isFinite(value)) invalid(); },
        write(value, cursor) { cursor.writeContinuous(node.slotIndex, value as number); } };
    case "nullable-f64":
      required.nullableContinuous.push(node.slotIndex);
      return { check(value) { if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) invalid(); },
        write(value, cursor) { cursor.writeNullableContinuous(node.slotIndex, value as number | null); } };
    case "boolean":
      required.booleans.push(node.slotIndex);
      return { check(value) { if (typeof value !== "boolean") invalid(); },
        write(value, cursor) { cursor.writeBoolean(node.slotIndex, value as boolean); } };
    case "string":
      return { check(value, cursor) { if (value !== cursor.readString(node.slotIndex)) invalid(); }, write() {} };
    case "record": {
      const entries = node.entries.map(entry => ({ key: entry.key, operation: compileFixedRootCompletionV1(entry.node, required) }));
      return {
        check(value, cursor) {
          if (value === null || typeof value !== "object"
            || Object.getPrototypeOf(value) !== (node.nullPrototype ? null : Object.prototype)
            || Reflect.ownKeys(value).length !== entries.length) invalid();
          for (const entry of entries) {
            const property = Object.getOwnPropertyDescriptor(value, entry.key);
            if (!property || !property.enumerable || !("value" in property)) invalid();
            entry.operation.check(property!.value, cursor);
          }
        },
        write(value, cursor) {
          for (const entry of entries) entry.operation.write((value as Record<string, unknown>)[entry.key], cursor);
        },
      };
    }
    case "array":
    case "typed-array": {
      const items = node.items.map(item => compileFixedRootCompletionV1(item, required));
      const prototype = node.kind === "array" ? Array.prototype : Object.getPrototypeOf(createNumericTypedArray(node.constructorTag, 0));
      return {
        check(value, cursor) {
          if ((node.kind === "array" ? !Array.isArray(value) : !ArrayBuffer.isView(value))
            || value === null || typeof value !== "object" || Object.getPrototypeOf(value) !== prototype
            || (value as ArrayLike<unknown>).length !== items.length
            || Reflect.ownKeys(value).length !== items.length + (node.kind === "array" ? 1 : 0)) invalid();
          for (let index = 0; index < items.length; index++) {
            const property = Object.getOwnPropertyDescriptor(value, String(index));
            if (!property || !property.enumerable || !("value" in property)) invalid();
            items[index]!.check(property!.value, cursor);
          }
        },
        write(value, cursor) {
          for (let index = 0; index < items.length; index++) items[index]!.write((value as ArrayLike<unknown>)[index], cursor);
        },
      };
    }
    default:
      throw new Error(`Transactional typed state fixed root completion does not support ${node.kind}`);
  }
}

function rehydrateNode(
  node: TypedStateNodeV1,
  image: MutableImageV1,
  externalImmutableRoots:
    readonly TransactionalTypedStateExternalImmutableRootV1[],
): unknown {
  switch (node.kind) {
    case "f64":
      return image.continuous[node.slotIndex]!;
    case "nullable-f64": {
      const present = image.nullableContinuousPresent[node.slotIndex]!;
      if (present === 0) return null;
      if (present !== 1) {
        throw new Error(
          "Transactional typed state nullable continuous presence is invalid",
        );
      }
      return image.nullableContinuous[node.slotIndex]!;
    }
    case "nullable-string": {
      const present = image.nullableStringPresent[node.slotIndex]!;
      if (present === 0) return null;
      if (present !== 1) {
        throw new Error(
          "Transactional typed state nullable string presence is invalid",
        );
      }
      const offset = image.nullableStringMetadata[node.slotIndex * 2]!;
      const length = image.nullableStringMetadata[node.slotIndex * 2 + 1]!;
      return UTF8_DECODER.decode(
        image.stringArena.subarray(offset, offset + length),
      );
    }
    case "optional-record": {
      const present = image.optionalRecordPresent[node.slotIndex]!;
      if (present === 0) return null;
      if (present !== 1) {
        throw new Error(
          "Transactional typed state optional record presence is invalid",
        );
      }
      return rehydrateNode(node.value, image, externalImmutableRoots);
    }
    case "bounded-array": {
      const length = image.boundedArrayLengths[node.slotIndex]!;
      if (length > node.items.length) {
        throw new Error(
          "Transactional typed state bounded-array length is invalid",
        );
      }
      return Object.freeze(Array.from(
        { length },
        (_, index) => rehydrateNode(
          node.items[index]!,
          image,
          externalImmutableRoots,
        ),
      ));
    }
    case "boolean":
      return image.booleans[node.slotIndex] === 1;
    case "string": {
      const offset = image.stringMetadata[node.slotIndex * 2]!;
      const length = image.stringMetadata[node.slotIndex * 2 + 1]!;
      return UTF8_DECODER.decode(image.stringArena.subarray(offset, offset + length));
    }
    case "dynamic": {
      const offset = image.dynamicMetadata[node.slotIndex * 2]!;
      const length = image.dynamicMetadata[node.slotIndex * 2 + 1]!;
      return decodeCanonicalFlatDataV1(
        image.dynamicArena.subarray(offset, offset + length),
      );
    }
    case "external":
      return externalImmutableRoots[node.slotIndex]!.value;
    case "typed-array": {
      const array = createNumericTypedArray(node.constructorTag, node.items.length);
      for (let index = 0; index < node.items.length; index += 1) {
        const value = rehydrateNode(
          node.items[index]!,
          image,
          externalImmutableRoots,
        );
        if (typeof value !== "number") {
          throw new Error("Transactional typed state typed-array item is not numeric");
        }
        array[index] = value;
      }
      return array;
    }
    case "array":
      return Object.freeze(
        node.items.map((item) =>
          rehydrateNode(item, image, externalImmutableRoots)),
      );
    case "record": {
      const record = node.nullPrototype
        ? Object.create(null) as Record<string, unknown>
        : {} as Record<string, unknown>;
      for (const entry of node.entries) {
        record[entry.key] = rehydrateNode(
          entry.node,
          image,
          externalImmutableRoots,
        );
      }
      return Object.freeze(record);
    }
  }
}

function compileNode(
  value: unknown,
  path: readonly FlatNumericalPathSegmentV1[],
  layout: FlatNumericalStateLayoutV1,
  compilingOptionalRootIndex: number | null = null,
): TypedStateNodeV1 {
  const pathPointer = pointer(path);
  const optionalRecordRootIndex = layout.optionalRecordRoots.findIndex(
    (root) => root.pointer === pathPointer,
  );
  if (
    optionalRecordRootIndex !== -1
    && compilingOptionalRootIndex !== optionalRecordRootIndex
  ) {
    return Object.freeze({
      kind: "optional-record" as const,
      slotIndex: optionalRecordRootIndex,
      value: compileNode(
        layout.optionalRecordRoots[optionalRecordRootIndex]!.template,
        path,
        layout,
        optionalRecordRootIndex,
      ),
    });
  }
  const boundedArrayRootIndex = layout.boundedArrayRoots.findIndex(
    (root) => root.pointer === pathPointer,
  );
  if (boundedArrayRootIndex !== -1) {
    const root = layout.boundedArrayRoots[boundedArrayRootIndex]!;
    return compileBoundedArrayNode(
      root.itemTemplate,
      root.path,
      boundedArrayRootIndex,
      root.capacity,
      layout,
    );
  }
  const externalIndex = slotIndex(
    layout.externalImmutableRoots,
    pathPointer,
  );
  if (externalIndex !== -1) {
    return Object.freeze({ kind: "external" as const, slotIndex: externalIndex });
  }
  const nullableContinuousIndex = slotIndex(
    layout.nullableContinuousSlots,
    pathPointer,
  );
  if (nullableContinuousIndex !== -1) {
    return Object.freeze({
      kind: "nullable-f64" as const,
      slotIndex: nullableContinuousIndex,
    });
  }
  const nullableStringIndex = slotIndex(
    layout.nullableStringSlots,
    pathPointer,
  );
  if (nullableStringIndex !== -1) {
    return Object.freeze({
      kind: "nullable-string" as const,
      slotIndex: nullableStringIndex,
    });
  }
  const dynamicIndex = slotIndex(layout.excludedDynamicRoots, pathPointer);
  if (dynamicIndex !== -1) {
    return Object.freeze({ kind: "dynamic" as const, slotIndex: dynamicIndex });
  }
  if (typeof value === "number") {
    return Object.freeze({
      kind: "f64" as const,
      slotIndex: requiredSlotIndex(layout.continuousSlots, pathPointer),
    });
  }
  if (typeof value === "boolean") {
    return Object.freeze({
      kind: "boolean" as const,
      slotIndex: requiredSlotIndex(layout.booleanSlots, pathPointer),
    });
  }
  if (typeof value === "string") {
    return Object.freeze({
      kind: "string" as const,
      slotIndex: requiredSlotIndex(layout.stringSlots, pathPointer),
    });
  }
  if (isNumericTypedArray(value)) {
    const items = Array.from(
      { length: value.length },
      (_, index) => compileNode(
        value[index],
        [...path, index],
        layout,
        compilingOptionalRootIndex,
      ),
    );
    return Object.freeze({
      kind: "typed-array" as const,
      constructorTag: value.constructor.name as NumericTypedArrayTagV1,
      items: Object.freeze(items),
    });
  }
  if (Array.isArray(value)) {
    return Object.freeze({
      kind: "array" as const,
      items: Object.freeze(value.map((item, index) =>
        compileNode(item, [...path, index], layout, compilingOptionalRootIndex))),
    });
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(
        `Transactional typed state ${pathPointer} has an unsupported record prototype`,
      );
    }
    const entries = Object.keys(value).sort().map((key) => Object.freeze({
      key,
      node: compileNode(
        requiredOwnValue(value, key, path),
        [...path, key],
        layout,
        compilingOptionalRootIndex,
      ),
    }));
    return Object.freeze({
      kind: "record" as const,
      nullPrototype: prototype === null,
      entries: Object.freeze(entries),
    });
  }
  throw new Error(`Transactional typed state ${pathPointer} has no compiled node`);
}

function compileBoundedArrayNode(
  itemTemplate: unknown,
  rootPath: readonly FlatNumericalPathSegmentV1[],
  slotIndex: number,
  capacity: number,
  layout: FlatNumericalStateLayoutV1,
): TypedStateBoundedArrayNodeV1 {
  return Object.freeze({
    kind: "bounded-array" as const,
    slotIndex,
    items: Object.freeze(Array.from(
      { length: capacity },
      (_, index) => compileNode(
        itemTemplate,
        [...rootPath, index],
        layout,
      ),
    )),
  });
}

function createImageLayout(
  layout: FlatNumericalStateLayoutV1,
  stringArenaCapacityBytes: number,
  dynamicArenaCapacityBytes: number,
): TypedStateImageLayoutV1 {
  let offset = 0;
  const continuousByteOffset = align(offset, 8);
  offset = continuousByteOffset + layout.continuousSlots.length * 8;
  const nullableContinuousByteOffset = align(offset, 8);
  offset = nullableContinuousByteOffset
    + layout.nullableContinuousSlots.length * 8;
  const nullableContinuousPresenceByteOffset = offset;
  offset += layout.nullableContinuousSlots.length;
  const booleanByteOffset = offset;
  offset += layout.booleanSlots.length;
  const stringMetadataByteOffset = align(offset, 4);
  offset = stringMetadataByteOffset + layout.stringSlots.length * 2 * 4;
  const nullableStringMetadataByteOffset = align(offset, 4);
  offset = nullableStringMetadataByteOffset
    + layout.nullableStringSlots.length * 2 * 4;
  const nullableStringPresenceByteOffset = offset;
  offset += layout.nullableStringSlots.length;
  const optionalRecordPresenceByteOffset = offset;
  offset += layout.optionalRecordRoots.length;
  const boundedArrayLengthByteOffset = align(offset, 4);
  offset = boundedArrayLengthByteOffset + layout.boundedArrayRoots.length * 4;
  const dynamicMetadataByteOffset = align(offset, 4);
  offset = dynamicMetadataByteOffset
    + layout.excludedDynamicRoots.length * 2 * 4;
  const stringArenaByteOffset = offset;
  offset += stringArenaCapacityBytes;
  const dynamicArenaByteOffset = offset;
  offset += dynamicArenaCapacityBytes;
  return Object.freeze({
    continuousByteOffset,
    nullableContinuousByteOffset,
    nullableContinuousPresenceByteOffset,
    booleanByteOffset,
    stringMetadataByteOffset,
    nullableStringMetadataByteOffset,
    nullableStringPresenceByteOffset,
    optionalRecordPresenceByteOffset,
    boundedArrayLengthByteOffset,
    dynamicMetadataByteOffset,
    stringArenaByteOffset,
    dynamicArenaByteOffset,
    bufferByteLength: offset,
  });
}

function createImage(manifest: TransactionalTypedStateManifestV1): MutableImageV1 {
  const layout = manifest.numericalLayout;
  const offsets = manifest.imageLayout;
  const buffer = new ArrayBuffer(offsets.bufferByteLength);
  return Object.freeze({
    buffer,
    continuous: new Float64Array(
      buffer,
      offsets.continuousByteOffset,
      layout.continuousSlots.length,
    ),
    nullableContinuous: new Float64Array(
      buffer,
      offsets.nullableContinuousByteOffset,
      layout.nullableContinuousSlots.length,
    ),
    nullableContinuousPresent: new Uint8Array(
      buffer,
      offsets.nullableContinuousPresenceByteOffset,
      layout.nullableContinuousSlots.length,
    ),
    booleans: new Uint8Array(
      buffer,
      offsets.booleanByteOffset,
      layout.booleanSlots.length,
    ),
    stringMetadata: new Uint32Array(
      buffer,
      offsets.stringMetadataByteOffset,
      layout.stringSlots.length * 2,
    ),
    nullableStringMetadata: new Uint32Array(
      buffer,
      offsets.nullableStringMetadataByteOffset,
      layout.nullableStringSlots.length * 2,
    ),
    nullableStringPresent: new Uint8Array(
      buffer,
      offsets.nullableStringPresenceByteOffset,
      layout.nullableStringSlots.length,
    ),
    optionalRecordPresent: new Uint8Array(
      buffer,
      offsets.optionalRecordPresenceByteOffset,
      layout.optionalRecordRoots.length,
    ),
    boundedArrayLengths: new Uint32Array(
      buffer,
      offsets.boundedArrayLengthByteOffset,
      layout.boundedArrayRoots.length,
    ),
    dynamicMetadata: new Uint32Array(
      buffer,
      offsets.dynamicMetadataByteOffset,
      layout.excludedDynamicRoots.length * 2,
    ),
    stringArena: new Uint8Array(
      buffer,
      offsets.stringArenaByteOffset,
      manifest.stringArenaCapacityBytes,
    ),
    dynamicArena: new Uint8Array(
      buffer,
      offsets.dynamicArenaByteOffset,
      manifest.dynamicArenaCapacityBytes,
    ),
  });
}

function createNumericTypedArray(
  tag: NumericTypedArrayTagV1,
  length: number,
): NumericTypedArrayV1 {
  switch (tag) {
    case "Float64Array": return new Float64Array(length);
    case "Float32Array": return new Float32Array(length);
    case "Int32Array": return new Int32Array(length);
    case "Uint32Array": return new Uint32Array(length);
    case "Int16Array": return new Int16Array(length);
    case "Uint16Array": return new Uint16Array(length);
    case "Int8Array": return new Int8Array(length);
    case "Uint8Array": return new Uint8Array(length);
    case "Uint8ClampedArray": return new Uint8ClampedArray(length);
  }
}

function isNumericTypedArray(value: unknown): value is NumericTypedArrayV1 {
  return value instanceof Float64Array
    || value instanceof Float32Array
    || value instanceof Int32Array
    || value instanceof Uint32Array
    || value instanceof Int16Array
    || value instanceof Uint16Array
    || value instanceof Int8Array
    || value instanceof Uint8Array
    || value instanceof Uint8ClampedArray;
}

function requiredOwnValue(
  record: object,
  key: string,
  path: readonly FlatNumericalPathSegmentV1[],
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined || !("value" in descriptor)) {
    throw new Error(
      `Transactional typed state ${pointer([...path, key])} is unavailable`,
    );
  }
  return descriptor.value;
}

function slotIndex(
  slots: readonly Readonly<{ pointer: string }>[],
  pathPointer: string,
): number {
  return slots.findIndex((slot) => slot.pointer === pathPointer);
}

function requiredSlotIndex(
  slots: readonly Readonly<{ pointer: string }>[],
  pathPointer: string,
): number {
  const index = slotIndex(slots, pathPointer);
  if (index === -1) {
    throw new Error(`Transactional typed state ${pathPointer} has no slot`);
  }
  return index;
}

function assertWellFormedString(value: string, pathPointer: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new Error(
          `Transactional typed state ${pathPointer} contains an unpaired surrogate`,
        );
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new Error(
        `Transactional typed state ${pathPointer} contains an unpaired surrogate`,
      );
    }
  }
}

function encodeCanonicalBytes(value: unknown): Uint8Array {
  const bytes = new Uint8Array(measureCanonicalFlatDataV1(value));
  const length = encodeCanonicalFlatDataIntoV1(value, bytes);
  if (length !== bytes.byteLength) {
    throw new Error(
      "Transactional typed state canonical immutable length changed",
    );
  }
  return bytes;
}

function assertTransitivelyFrozenData(
  value: unknown,
  pathPointer: string,
  visited: Set<object>,
): void {
  if (value === null || typeof value !== "object") return;
  if (visited.has(value)) {
    throw new Error(
      `Transactional typed state external immutable ${pathPointer} is cyclic`,
    );
  }
  if (!Object.isFrozen(value)) {
    throw new Error(
      `Transactional typed state external immutable ${pathPointer} must be frozen`,
    );
  }
  visited.add(value);
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    throw new Error(
      `Transactional typed state external immutable ${pathPointer} has symbol keys`,
    );
  }
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    throw new Error(
      `Transactional typed state external immutable ${pathPointer} must be plain data`,
    );
  }
  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (
    !array
    && prototype !== Object.prototype
    && prototype !== null
  ) {
    throw new Error(
      `Transactional typed state external immutable ${pathPointer} has an unsupported prototype`,
    );
  }
  for (const key of Object.getOwnPropertyNames(value)) {
    if (array && key === "length") continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined
      || !("value" in descriptor)
      || !descriptor.enumerable
    ) {
      throw new Error(
        `Transactional typed state external immutable ${pathPointer}/${key} is not plain data`,
      );
    }
  }
  for (const key of Object.keys(value)) {
    const childPointer = `${pathPointer}/${key
      .replaceAll("~", "~0")
      .replaceAll("/", "~1")}`;
    assertTransitivelyFrozenData(
      requiredOwnValue(value, key, []),
      childPointer,
      visited,
    );
  }
  visited.delete(value);
}

function assertArenaCapacity(
  capacity: number,
  owner: string,
  allowZero = false,
): void {
  if (
    !Number.isSafeInteger(capacity)
    || capacity < (allowZero ? 0 : 1)
    || capacity > MAX_ARENA_CAPACITY_BYTES
  ) {
    throw new Error(`Transactional typed state ${owner} arena capacity is invalid`);
  }
}

function align(value: number, alignment: number): number {
  return Math.ceil(value / alignment) * alignment;
}

function pointer(path: readonly FlatNumericalPathSegmentV1[]): string {
  if (path.length === 0) return "/";
  return `/${path.map((segment) => String(segment)
    .replaceAll("~", "~0")
    .replaceAll("/", "~1")).join("/")}`;
}

function manifestFingerprint(
  layout: FlatNumericalStateLayoutV1,
  stringCapacity: number,
  dynamicCapacity: number,
): string {
  const canonical = [
    `layout:${layout.layoutId}`,
    `string-capacity:${stringCapacity}`,
    `dynamic-capacity:${dynamicCapacity}`,
    ...layout.continuousSlots.map(({ pointer: value }) => `f64:${value}`),
    ...layout.nullableContinuousSlots.map(
      ({ pointer: value }) => `nullable-f64:${value}`,
    ),
    ...layout.nullableStringSlots.map(
      ({ pointer: value }) => `nullable-string:${value}`,
    ),
    ...layout.optionalRecordRoots.map(
      ({ pointer: value }) => `optional-record:${value}`,
    ),
    ...layout.boundedArrayRoots.map(
      ({ pointer: value, capacity }) =>
        `bounded-array:${value}:capacity:${capacity}`,
    ),
    ...layout.booleanSlots.map(({ pointer: value }) => `bool:${value}`),
    ...layout.stringSlots.map(({ pointer: value }) => `string:${value}`),
    ...layout.externalImmutableRoots.map(
      ({ pointer: value }) => `external-immutable:${value}`,
    ),
    ...layout.externalImmutableAliases.map(
      ({ pointer: value, sourcePointer }) =>
        `external-immutable-alias:${value}:source:${sourcePointer}`,
    ),
    ...layout.excludedDynamicRoots.map(({ pointer: value }) => `dynamic:${value}`),
    ...layout.containers.map((container) => (
      container.boundedArrayRootIndex === null
        ? container.optionalRecordRootIndex === null
          ? [
            "container",
            container.pointer,
            container.kind,
            container.prototypeTag ?? "null",
            container.keys.join(","),
          ]
          : [
            "container",
            container.pointer,
            container.kind,
            container.prototypeTag ?? "null",
            `optional-root-${container.optionalRecordRootIndex}`,
            container.keys.join(","),
          ]
        : [
          "container",
          container.pointer,
          container.kind,
          container.prototypeTag ?? "null",
          `bounded-root-${container.boundedArrayRootIndex}`,
          `bounded-item-${container.boundedArrayItemIndex}`,
          container.keys.join(","),
        ]
    ).join(":")),
  ].join("\n");
  let hash = 0x811c9dc5;
  for (const byte of UTF8_ENCODER.encode(canonical)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32-${hash.toString(16).padStart(8, "0")}`;
}

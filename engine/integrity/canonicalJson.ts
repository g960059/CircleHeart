import { isTransitivelyFrozenPlainDataV1, validationStampReuseEligibleV1 } from "../validationStampModeV1";

export const CANONICAL_JSON_ALGORITHM_V1 =
  "rfc8785-compatible-canonical-json-v1" as const;

export type CanonicalJsonPrimitive = null | boolean | number | string;
export type CanonicalJsonArray = readonly CanonicalJsonValue[];
export type CanonicalJsonObject = Readonly<{
  [key: string]: CanonicalJsonValue;
}>;
export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | CanonicalJsonArray
  | CanonicalJsonObject;

const MAXIMUM_CANONICAL_JSON_DEPTH = 256;
// Only complete successful encodings of immutable subtrees enter this cache.
// Remember the deepest validated placement: reusing at a shallower depth is
// safe, but a deeper placement must still enforce the nesting bound.
const immutableSubtrees = new WeakMap<object, { text: string; validatedAtDepth: number }>();

export class CanonicalJsonError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`canonical JSON rejected ${path}: ${message}`);
    this.name = "CanonicalJsonError";
    this.path = path;
  }
}

/**
 * Serializes the JSON data model deterministically using the RFC 8785/JCS
 * property ordering and ECMAScript primitive serialization rules.
 *
 * Unlike JSON.stringify, this is deliberately fail-closed: values that JSON
 * would silently omit or coerce (undefined, holes, NaN, accessors, class
 * instances, and symbol properties) are rejected rather than changing an
 * integrity digest invisibly.
 */
export function canonicalJsonStringify(value: unknown, reuseImmutableSubtrees = false): string {
  return serializeCanonicalJson(value, "$", new Set<object>(), 0,
    reuseImmutableSubtrees && validationStampReuseEligibleV1());
}

/** Creates a detached, recursively frozen snapshot of canonical JSON data. */
export function cloneAndFreezeCanonicalJson<T extends CanonicalJsonValue>(
  value: unknown,
): Readonly<T> {
  const cloned = JSON.parse(canonicalJsonStringify(value)) as T;
  return deepFreezeCanonicalJson(cloned);
}

export function deepFreezeCanonicalJson<T extends CanonicalJsonValue>(
  value: T,
): Readonly<T> {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) {
      deepFreezeCanonicalJson(child);
    }
    Object.freeze(value);
  }
  return value;
}

function serializeCanonicalJson(
  value: unknown,
  path: string,
  ancestors: Set<object>,
  depth: number,
  reuseImmutableSubtrees: boolean,
): string {
  if (depth > MAXIMUM_CANONICAL_JSON_DEPTH) {
    throw new CanonicalJsonError(
      path,
      `nesting exceeds ${MAXIMUM_CANONICAL_JSON_DEPTH}`,
    );
  }
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") {
    assertUnicodeScalarSequence(value, path);
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CanonicalJsonError(path, "numbers must be finite");
    }
    return JSON.stringify(value);
  }
  if (typeof value !== "object") {
    throw new CanonicalJsonError(
      path,
      `${typeof value} is outside the JSON data model`,
    );
  }

  if (ancestors.has(value)) {
    throw new CanonicalJsonError(path, "cyclic references are not allowed");
  }
  const cached = reuseImmutableSubtrees ? immutableSubtrees.get(value) : undefined;
  if (cached && depth <= cached.validatedAtDepth) return cached.text;
  const remember = (text: string): string => {
    if (reuseImmutableSubtrees && Object.isFrozen(value) && isTransitivelyFrozenPlainDataV1(value)) {
      immutableSubtrees.set(value, { text, validatedAtDepth: depth });
    }
    return text;
  };
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      assertCanonicalArrayShape(value, path);
      return remember(`[${value.map((child, index) =>
        serializeCanonicalJson(
          child,
          `${path}[${index}]`,
          ancestors,
          depth + 1,
          reuseImmutableSubtrees,
        )).join(",")}]`);
    }

    assertPlainDataObject(value, path);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Object.keys(descriptors).sort();
    return remember(`{${keys.map((key) => {
      assertUnicodeScalarSequence(key, `${path} property name`);
      const descriptor = descriptors[key];
      if (!descriptor.enumerable) {
        throw new CanonicalJsonError(
          propertyPath(path, key),
          "non-enumerable properties are not canonical JSON data",
        );
      }
      if (!("value" in descriptor)) {
        throw new CanonicalJsonError(
          propertyPath(path, key),
          "accessor properties are not canonical JSON data",
        );
      }
      return `${JSON.stringify(key)}:${serializeCanonicalJson(
        descriptor.value,
        propertyPath(path, key),
        ancestors,
        depth + 1,
        reuseImmutableSubtrees,
      )}`;
    }).join(",")}}`);
  } finally {
    ancestors.delete(value);
  }
}

function assertCanonicalArrayShape(value: readonly unknown[], path: string): void {
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === "symbol")) {
    throw new CanonicalJsonError(path, "symbol properties are not allowed");
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      throw new CanonicalJsonError(`${path}[${index}]`, "sparse arrays are not allowed");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      throw new CanonicalJsonError(
        `${path}[${index}]`,
        "array accessors and hidden elements are not allowed",
      );
    }
  }
  const expectedKeys = new Set(["length", ...value.map((_, index) => String(index))]);
  for (const key of ownKeys) {
    if (typeof key === "string" && !expectedKeys.has(key)) {
      throw new CanonicalJsonError(
        propertyPath(path, key),
        "custom array properties are not allowed",
      );
    }
  }
}

function assertPlainDataObject(value: object, path: string): void {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new CanonicalJsonError(path, "only plain objects are allowed");
  }
  if (Reflect.ownKeys(value).some((key) => typeof key === "symbol")) {
    throw new CanonicalJsonError(path, "symbol properties are not allowed");
  }
}

function assertUnicodeScalarSequence(value: string, path: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new CanonicalJsonError(path, "unpaired high surrogate is not valid Unicode");
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new CanonicalJsonError(path, "unpaired low surrogate is not valid Unicode");
    }
  }
}

function propertyPath(parent: string, key: string): string {
  return `${parent}[${JSON.stringify(key)}]`;
}

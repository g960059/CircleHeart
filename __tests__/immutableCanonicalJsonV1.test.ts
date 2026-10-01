import { afterEach, describe, expect, it, vi } from "vitest";
import * as original from "@/engine/integrity/canonicalJson";
import { canonicalJsonStringify as cached } from "@/engine/integrity/immutableCanonicalJsonV1";
import { selectValidationStampModeV1, validationStampModeV1 } from "@/engine/validationStampModeV1";

const initialMode = validationStampModeV1();
afterEach(() => { selectValidationStampModeV1(initialMode); vi.restoreAllMocks(); });

describe("candidate immutable canonical encoding", () => {
  it("reuses shared immutable settings without trusting new enclosing state", () => {
    const settings = original.deepFreezeCanonicalJson({ nested: { source: "心臓", coefficients: [1, 2, 3] } });
    for (const value of [{ tick: 1, settings }, { settings, tick: 2 }, { left: settings, right: settings }]) {
      expect(cached(value)).toBe(original.canonicalJsonStringify(value));
    }
    const enclosing: { settings: typeof settings; tick: number } = { settings, tick: 3 };
    expect(cached(enclosing)).toBe(original.canonicalJsonStringify(enclosing));
    enclosing.tick = NaN;
    expect(() => cached(enclosing)).toThrow('numbers must be finite');
  });

  it("does not reuse a shallow encoding past the canonical nesting bound", () => {
    const branch = original.deepFreezeCanonicalJson({ a: { b: 1 } });
    cached(branch);
    let nested: unknown = branch;
    for (let i = 0; i < 254; i++) nested = Object.freeze({ child: nested });
    expect(cached(nested)).toBe(original.canonicalJsonStringify(nested));
    const tooDeep = Object.freeze({ child: nested });
    const errorOf = (encode: (value: unknown) => string) => {
      try { encode(tooDeep); } catch (error) { return (error as Error).message; }
      throw new Error("Expected nesting rejection");
    };
    expect(errorOf(cached)).toBe(errorOf(original.canonicalJsonStringify));
  });

  it("reuses only a successful immutable encoding and retains a full audit mode", () => {
    selectValidationStampModeV1("validation-stamps-enabled");
    const value = original.deepFreezeCanonicalJson({ z: [null, -0, true, "心臓", 1e-12], a: { b: 42 } });
    const serialize = vi.spyOn(original, "canonicalJsonStringify");
    const first = cached(value);
    expect(first).toBe('{"a":{"b":42},"z":[null,0,true,"心臓",1e-12]}');
    expect(cached(value)).toBe(first);
    expect(serialize).toHaveBeenCalledTimes(1);
    selectValidationStampModeV1("validation-stamps-disabled");
    expect(cached(value)).toBe(first);
    expect(cached(value)).toBe(first);
    expect(serialize).toHaveBeenCalledTimes(3);
    selectValidationStampModeV1("validation-stamps-enabled");
    expect(cached(value)).toBe(first);
    expect(serialize).toHaveBeenCalledTimes(3);
  });

  it("does not cache shallow-frozen graphs with mutable descendants", () => {
    selectValidationStampModeV1("validation-stamps-enabled");
    const child = { value: 1 }, list = [1];
    const value = Object.freeze({ child, list });
    expect(cached(value)).toBe(original.canonicalJsonStringify(value));
    child.value = 2; list.push(3);
    expect(cached(value)).toBe('{"child":{"value":2},"list":[1,3]}');
    Object.freeze(child); Object.freeze(list);
    expect(cached(value)).toBe(original.canonicalJsonStringify(value));
    expect(cached(value)).toBe(original.canonicalJsonStringify(value));
  });

  it("never confuses equal-looking identities or retains mutable input results", () => {
    const a = Object.freeze({ x: 1 }), b = Object.freeze({ x: 2 }), mutable = { x: 1 };
    expect(cached(a)).toBe('{"x":1}');
    expect(cached(b)).toBe('{"x":2}');
    expect(cached(mutable)).toBe('{"x":1}');
    mutable.x = 3;
    expect(cached(mutable)).toBe('{"x":3}');
    const nullPrototype = Object.freeze(Object.assign(Object.create(null), { z: 1, a: 2 }));
    expect(cached(nullPrototype)).toBe(original.canonicalJsonStringify(nullPrototype));
  });

  it("retains canonical rejection paths without evaluating accessors or caching failures", () => {
    let getterCalls = 0;
    const getter = Object.freeze({ get value() { getterCalls++; return 1; } });
    const cycle: { child?: unknown } = {}; cycle.child = cycle; Object.freeze(cycle);
    const nonEnumerable = Object.freeze(Object.defineProperty({}, "hidden", { value: 1 }));
    const invalid = [getter, cycle, nonEnumerable, Object.freeze([, 1]),
      Object.freeze({ [Symbol("hidden")]: 1 }), Object.freeze({ value: NaN }),
      Object.freeze({ value: Infinity }), Object.freeze({ value: undefined }),
      Object.freeze({ value: 1n }), Object.freeze({ value: () => 1 }),
      Object.freeze({ value: "\ud800" }), Object.freeze(new Date(0))];
    const errorOf = (serialize: (value: unknown) => string, value: unknown) => {
      try { serialize(value); throw new Error("Unexpected valid data"); }
      catch (error) { expect(error).toBeInstanceOf(original.CanonicalJsonError); return (error as Error).message; }
    };
    for (const value of invalid) {
      const expected = errorOf(original.canonicalJsonStringify, value);
      expect(errorOf(cached, value)).toBe(expected);
      expect(errorOf(cached, value)).toBe(expected);
    }
    expect(getterCalls).toBe(0);
    const repairable: { value?: number } = {};
    repairable.value = NaN;
    expect(() => cached(repairable)).toThrow(original.CanonicalJsonError);
    repairable.value = 3;
    expect(cached(Object.freeze(repairable))).toBe('{"value":3}');
  });
});

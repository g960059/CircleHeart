import {
  createMainWireAcceptedTypedStateManifestV1,
  MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_FINGERPRINT,
} from "./MainWireAcceptedTypedStateV1";
import { assertTransactionalTypedStateManifestIssuedV1, type TransactionalTypedStateManifestV1 } from "./TransactionalTypedStateImageV1";
import { studioCanonicalJsonStringify } from "@/domain/json/CanonicalJson";
import { isTransitivelyFrozenPlainDataV1 } from "@/engine/validationStampModeV1";

export type MainWireAcceptedTypedExtensionBindingV1 = Readonly<{
  baseFingerprint: typeof MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_FINGERPRINT;
  layoutId: string;
  fingerprint: string;
}>;

const BINDINGS = new WeakMap<object, TransactionalTypedStateManifestV1>();

/** A shape projection, not a scientific admission or a second state owner.
 * The pinned base layout must survive exactly below all its original roots;
 * extensions may add only separately named fixed numerical root records. */
export function bindMainWireAcceptedTypedExtensionV1(
  baseState: Parameters<typeof createMainWireAcceptedTypedStateManifestV1>[0],
  manifest: TransactionalTypedStateManifestV1,
  extensionKeys: readonly string[],
): MainWireAcceptedTypedExtensionBindingV1 {
  assertTransactionalTypedStateManifestIssuedV1(manifest);
  const base = createMainWireAcceptedTypedStateManifestV1(baseState);
  if (!Object.isFrozen(manifest) || !isTransitivelyFrozenPlainDataV1(manifest.numericalLayout)
    || !isTransitivelyFrozenPlainDataV1(manifest.rootNode)
    || manifest.layoutId === base.layoutId || manifest.rootNode.kind !== "record" || base.rootNode.kind !== "record"
    || extensionKeys.length === 0 || new Set(extensionKeys).size !== extensionKeys.length
    || extensionKeys.some(key => !key || key.includes("/") || key.includes("~"))) {
    throw new Error("Main Wire typed extension requires distinct named roots");
  }
  const baseKeys = base.rootNode.entries.map(entry => entry.key);
  if (extensionKeys.some(key => baseKeys.includes(key))
    || JSON.stringify(manifest.rootNode.entries.map(entry => entry.key).sort())
      !== JSON.stringify([...baseKeys, ...extensionKeys].sort())) {
    throw new Error("Main Wire typed extension shadows or omits a base root");
  }
  const isExtension = (pointer: string) => extensionKeys.some(key => pointer === `/${key}` || pointer.startsWith(`/${key}/`));
  const same = (actual: unknown, expected: unknown, label: string) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Main Wire typed extension changed base ${label}`);
  };
  const source = base.numericalLayout, target = manifest.numericalLayout;
  same([manifest.stringArenaCapacityBytes, manifest.dynamicArenaCapacityBytes],
    [base.stringArenaCapacityBytes, base.dynamicArenaCapacityBytes], "arena capacities");
  const normalizedNode = (node: TransactionalTypedStateManifestV1["rootNode"], m: TransactionalTypedStateManifestV1): unknown => {
    if (node.kind === "record") return { ...node, entries: node.entries.map(entry => ({ key: entry.key, node: normalizedNode(entry.node, m) })) };
    if (node.kind === "array" || node.kind === "typed-array" || node.kind === "bounded-array") {
      return { ...node, items: node.items.map(item => normalizedNode(item, m)) };
    }
    if (node.kind === "optional-record") return { ...node, value: normalizedNode(node.value, m) };
    const slots = node.kind === "f64" ? m.numericalLayout.continuousSlots
      : node.kind === "nullable-f64" ? m.numericalLayout.nullableContinuousSlots
      : node.kind === "nullable-string" ? m.numericalLayout.nullableStringSlots
      : node.kind === "boolean" ? m.numericalLayout.booleanSlots
      : node.kind === "string" ? m.numericalLayout.stringSlots
      : node.kind === "external" ? m.numericalLayout.externalImmutableRoots : m.numericalLayout.excludedDynamicRoots;
    const slot = slots[node.slotIndex];
    if (slot === undefined) throw new Error("Main Wire typed extension has an invalid compiled node");
    return { kind: node.kind, pointer: slot.pointer };
  };
  same(manifest.rootNode.entries.filter(entry => !extensionKeys.includes(entry.key)).map(entry =>
    ({ key: entry.key, node: normalizedNode(entry.node, manifest) })), base.rootNode.entries.map(entry =>
    ({ key: entry.key, node: normalizedNode(entry.node, base) })), "compiled nodes");
  for (const key of ["continuousSlots", "nullableContinuousSlots", "nullableStringSlots", "booleanSlots", "stringSlots",
    "externalImmutableRoots", "excludedDynamicRoots"] as const) {
    same(target[key].filter(slot => !isExtension(slot.pointer)), source[key], key);
  }
  for (const key of ["optionalRecordRoots", "boundedArrayRoots", "externalImmutableAliases"] as const) {
    same(target[key], source[key], key);
  }
  same(target.containers.filter(item => !isExtension(item.pointer)).map(item => item.pointer === "/"
    ? { ...item, keys: item.keys.filter(key => !extensionKeys.includes(key)) } : item), source.containers, "containers");
  if (target.externalImmutableRoots.some(slot => isExtension(slot.pointer))
    || target.excludedDynamicRoots.some(slot => isExtension(slot.pointer))
    || target.nullableStringSlots.some(slot => isExtension(slot.pointer))) {
    throw new Error("Main Wire typed extension must have fixed numerical roots");
  }
  same(manifest.externalImmutableRoots.map(({ pointer, bindingPointer, canonicalByteLength }) =>
    ({ pointer, bindingPointer, canonicalByteLength })), base.externalImmutableRoots.map(({ pointer, bindingPointer, canonicalByteLength }) =>
    ({ pointer, bindingPointer, canonicalByteLength })), "immutable bindings");
  for (let i = 0; i < base.externalImmutableRoots.length; i++) {
    const left = manifest.externalImmutableRoots[i]!.value, right = base.externalImmutableRoots[i]!.value;
    if (left !== right && studioCanonicalJsonStringify(left) !== studioCanonicalJsonStringify(right)) {
      throw new Error("Main Wire typed extension changed immutable binding contents");
    }
  }
  const binding = Object.freeze({ baseFingerprint: base.fingerprint as typeof MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_FINGERPRINT,
    layoutId: manifest.layoutId, fingerprint: manifest.fingerprint });
  BINDINGS.set(binding, manifest);
  return binding;
}

export function assertMainWireAcceptedTypedExtensionBindingV1(
  binding: MainWireAcceptedTypedExtensionBindingV1,
  manifest: TransactionalTypedStateManifestV1,
): void {
  if (BINDINGS.get(binding) !== manifest || binding.layoutId !== manifest.layoutId || binding.fingerprint !== manifest.fingerprint) {
    throw new Error("Main Wire typed extension binding is foreign or unproved");
  }
}

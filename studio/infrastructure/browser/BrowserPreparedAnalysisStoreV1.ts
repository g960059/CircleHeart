export const BROWSER_PREPARED_ANALYSIS_STORE_KEY_V1 =
  "circleheart.studio.prepared-scenario-analyses.v1";

type EnvelopeV1 = Readonly<{
  schemaId: "circleheart-browser-prepared-scenario-analyses-v1";
  /** Content-addressed by the exact capture (fixture + checkpoint) hash. */
  recordsByCaptureSha256: Readonly<Record<string, unknown>>;
}>;

/**
 * Browser-local home for sealed-state Scenario analyses that travel with a
 * Snapshot instead of the registry. Records are opaque here; the Reader
 * validates every record against the pinned model, artifact revision, Surface
 * method, and capture hash before use, exactly like registry preparations.
 *
 * This store is device-local. A durable home next to Snapshot persistence is
 * a separate backend decision; nothing in this module claims qualification.
 */
export class BrowserPreparedAnalysisStoreV1 {
  readonly #storage: Pick<Storage, "getItem" | "setItem"> | null;

  constructor(storage: Pick<Storage, "getItem" | "setItem"> | null = defaultStorageV1()) {
    this.#storage = storage;
  }

  /** The caller hashes the capture with the same canonical digest the records use. */
  read(captureSha256: string): unknown | null {
    const envelope = this.#load();
    if (envelope === null) return null;
    return envelope.recordsByCaptureSha256[captureSha256] ?? null;
  }

  /** Records are keyed by their own `captureSha256`; unrelated entries survive. */
  writeAll(records: readonly Readonly<{ captureSha256: string }>[]): void {
    if (this.#storage === null) return;
    const current = this.#load() ?? { schemaId: "circleheart-browser-prepared-scenario-analyses-v1", recordsByCaptureSha256: {} };
    const next: Record<string, unknown> = { ...current.recordsByCaptureSha256 };
    for (const record of records) next[record.captureSha256] = record;
    try {
      this.#storage.setItem(BROWSER_PREPARED_ANALYSIS_STORE_KEY_V1, JSON.stringify({
        schemaId: "circleheart-browser-prepared-scenario-analyses-v1", recordsByCaptureSha256: next,
      } satisfies EnvelopeV1));
    } catch {
      // Prepared analyses are optional acceleration only.
    }
  }

  #load(): EnvelopeV1 | null {
    if (this.#storage === null) return null;
    try {
      const raw = this.#storage.getItem(BROWSER_PREPARED_ANALYSIS_STORE_KEY_V1);
      if (raw === null) return null;
      const parsed = JSON.parse(raw) as Partial<EnvelopeV1> | null;
      if (parsed?.schemaId !== "circleheart-browser-prepared-scenario-analyses-v1"
        || parsed.recordsByCaptureSha256 === null || typeof parsed.recordsByCaptureSha256 !== "object") return null;
      return parsed as EnvelopeV1;
    } catch {
      return null;
    }
  }
}

function defaultStorageV1(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

import { describe, expect, it, vi } from "vitest";
import type { ScenarioCaptureV2 } from "@/studio/contracts/v2/content";
import {
  prepareStudioSnapshotCaptureV1,
  type StudioSnapshotPreparationIdentityV1,
  type StudioSnapshotPreparationPortV1,
  type StudioSnapshotPreparationResultV1,
  type StudioSnapshotSettlementMethodV1,
} from "@/studio/application/authoring/StudioSnapshotPreparationV1";

const identity: StudioSnapshotPreparationIdentityV1 = {
  modelId: "model/example", artifactRevisionId: "a".repeat(64), surfaceReleaseId: "surface/1",
};
const method: StudioSnapshotSettlementMethodV1 = {
  methodId: "method/full-system-steady-v1", purpose: "full-system-steady",
  configuration: { tolerance: 0.001, independentSeeds: 2 },
};
function capture(revision = 3): ScenarioCaptureV2 {
  return { fixture: { forcing: 1 }, checkpoint: {
    acceptedRevision: revision, acceptedTimeSec: revision / 10, payload: { inventory: 5 },
  } };
}
function methodPort(result?: StudioSnapshotPreparationResultV1) {
  return {
    supports: vi.fn(() => true),
    prepare: vi.fn(async (_input: Parameters<StudioSnapshotPreparationPortV1["prepare"]>[0]): Promise<StudioSnapshotPreparationResultV1> => result ?? {
      status: "qualified", capture: capture(8),
      evidence: { independentSeeds: 2, holdoutPassed: true },
    }),
  } satisfies StudioSnapshotPreparationPortV1;
}

describe("purpose-bound Snapshot preparation", () => {
  it("defaults only the new preparation workflow to steady and fails closed without a method", async () => {
    await expect(prepareStudioSnapshotCaptureV1({ identity, capture: capture() }))
      .rejects.toThrow("requires a compatible settlement method");
    await expect(prepareStudioSnapshotCaptureV1({ identity, capture: capture(), request: { method } }))
      .rejects.toThrow("requires a compatible settlement method");
  });

  it("preserves the exact transient capture without running or inferring settlement", async () => {
    const source = capture();
    const port = methodPort();
    const prepared = await prepareStudioSnapshotCaptureV1({
      identity, capture: source, port, request: { mode: "preserve-transient" },
    });
    expect(prepared).toEqual({ mode: "preserve-transient", capture: source, settlement: null });
    expect(prepared.capture).not.toBe(source);
    expect(Object.isFrozen(prepared.capture.checkpoint.payload)).toBe(true);
    expect(port.supports).not.toHaveBeenCalled();
    expect(port.prepare).not.toHaveBeenCalled();
  });

  it("prepares a new checkpoint with separate evidence and reuses it only at the qualified capture", async () => {
    const port = methodPort();
    const prepared = await prepareStudioSnapshotCaptureV1({
      identity, capture: capture(), port, request: { method },
    });
    expect(prepared.capture).toEqual(capture(8));
    expect(prepared.settlement).toMatchObject({ identity, method });
    expect(prepared.settlement!.sourceCaptureSha256).not.toBe(prepared.settlement!.qualifiedCaptureSha256);
    expect(Object.isFrozen(prepared.settlement!.method.configuration)).toBe(true);
    const reused = await prepareStudioSnapshotCaptureV1({
      identity, capture: JSON.parse(JSON.stringify(prepared.capture)), port,
      request: { method, reusableEvidence: prepared.settlement! },
    });
    expect(reused.settlement).toBe(prepared.settlement);
    expect(port.prepare).toHaveBeenCalledTimes(1);
    // Returning to the earlier capture cannot inherit the later checkpoint's evidence.
    await prepareStudioSnapshotCaptureV1({ identity, capture: capture(), port,
      request: { method, reusableEvidence: prepared.settlement! } });
    expect(port.prepare).toHaveBeenCalledTimes(2);
  });

  it.each(["artifact", "model", "surface", "method", "configuration", "clock", "payload", "fixture", "cloned-proof"])(
    "does not reuse stale or unadmitted evidence after changing %s", async (change) => {
      const port = methodPort();
      const prepared = await prepareStudioSnapshotCaptureV1({
        identity, capture: capture(), port, request: { method },
      });
      let nextCapture = prepared.capture;
      let nextIdentity = identity;
      let nextMethod = method;
      let reusableEvidence = prepared.settlement!;
      if (change === "artifact") nextIdentity = { ...identity, artifactRevisionId: "b".repeat(64) };
      if (change === "model") nextIdentity = { ...identity, modelId: "model/2" };
      if (change === "surface") nextIdentity = { ...identity, surfaceReleaseId: "surface/2" };
      if (change === "method") nextMethod = { ...method, methodId: "method/2" };
      if (change === "configuration") nextMethod = { ...method, configuration: { tolerance: 0.002 } };
      if (change === "clock") nextCapture = { ...nextCapture, checkpoint: { ...nextCapture.checkpoint, acceptedRevision: 9 } };
      if (change === "payload") nextCapture = { ...nextCapture, checkpoint: { ...nextCapture.checkpoint, payload: { inventory: 6 } } };
      if (change === "fixture") nextCapture = { ...nextCapture, fixture: { forcing: 2 } };
      if (change === "cloned-proof") reusableEvidence = JSON.parse(JSON.stringify(reusableEvidence));
      port.prepare.mockResolvedValue({ status: "qualified", capture: nextCapture, evidence: { holdoutPassed: true } });
      await prepareStudioSnapshotCaptureV1({ identity: nextIdentity, capture: nextCapture, port,
        request: { method: nextMethod, reusableEvidence } });
      expect(port.prepare).toHaveBeenCalledTimes(2);
    },
  );

  it.each(["insufficient-evidence", "branch-mismatch", "failed"] as const)(
    "never emits a prepared capture when the method reports %s", async (status) => {
      await expect(prepareStudioSnapshotCaptureV1({ identity, capture: capture(), request: { method },
        port: methodPort({ status, reason: "holdout unavailable" }) }))
        .rejects.toThrow(status);
    },
  );

  it("rejects incompatible methods and fixture substitution", async () => {
    const unsupported = methodPort();
    unsupported.supports.mockReturnValue(false);
    await expect(prepareStudioSnapshotCaptureV1({ identity, capture: capture(), request: { method }, port: unsupported }))
      .rejects.toThrow("incompatible");
    expect(unsupported.prepare).not.toHaveBeenCalled();
    const substituting = methodPort({ status: "qualified", capture: { ...capture(8), fixture: { forcing: 2 } }, evidence: {} });
    await expect(prepareStudioSnapshotCaptureV1({ identity, capture: capture(), request: { method }, port: substituting }))
      .rejects.toThrow("preserve the exact fixture");
  });

  it("owns capture and method before asynchronous preparation begins", async () => {
    const source = JSON.parse(JSON.stringify(capture()));
    const mutableMethod = JSON.parse(JSON.stringify(method));
    const port = methodPort();
    const promise = prepareStudioSnapshotCaptureV1({ identity, capture: source, request: { method: mutableMethod }, port });
    source.fixture.forcing = 99;
    mutableMethod.configuration.tolerance = 99;
    const result = await promise;
    expect(port.prepare.mock.calls[0]![0]).toMatchObject({ capture: capture(), method });
    expect(result.settlement!.method).toEqual(method);
  });
});

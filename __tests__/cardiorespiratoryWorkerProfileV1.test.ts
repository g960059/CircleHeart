import { EventEmitter } from "node:events";
import type { CDPSession, Page } from "@playwright/test";
import { describe, expect, it, vi } from "vitest";
import { CardiorespiratoryWorkerCdpRpcV1, parseCardiorespiratoryWorkerProfileArgumentsV1 as parse,
  summarizeCardiorespiratoryWorkerCpuProfileV1 as summarize, type CardiorespiratoryCpuProfileV1 } from "../tools/performance/cardiorespiratoryWorkerProfileV1";
import { parseCardiorespiratoryBrowserArgumentsV1 as parseBrowser } from "../tools/performance/cardiorespiratoryBrowserMeasurementsV1";
import { selectMeasuredPlaybackRateV1 } from "../tools/performance/workbenchMeasuredPlaybackRateV1";

describe("dedicated numerical Worker profiler", () => {
  it("requires explicit evidence output and a bounded 5–30 second window", () => {
    expect(parse(["--output", "/tmp/worker.cpuprofile"])).toEqual({ origin: "http://127.0.0.1:4220", output: "/tmp/worker.cpuprofile", sampleMs: 5000, headed: false, playbackRate: 1 });
    expect(parse(["--origin", "http://localhost:4216/", "--output", "/tmp/w.cpuprofile", "--headed", "--sample-ms", "30000"]))
      .toMatchObject({ origin: "http://localhost:4216", headed: true, sampleMs: 30000 });
    for (const args of [[], ["--output"], ["--output", "/tmp/p", "--sample-ms", "4999"],
      ["--output", "/tmp/p", "--sample-ms", "30001"], ["--output", "/tmp/p", "--sample-ms", "NaN"],
      ["--output", "/tmp/p", "--headed", "--headed"], ["--output", "/tmp/p", "--origin", "file:///tmp/p"]]) {
      expect(() => parse(args)).toThrow();
    }
  });

  it("shares the browser harness playback bounds and step validation", () => {
    for (const rate of [.25, .5, 1, 4, 5]) {
      const args = ["--playback-rate", String(rate)];
      expect(parse(["--output", "/tmp/p", ...args]).playbackRate).toBe(rate);
      expect(parseBrowser(args).targetPlaybackRate).toBe(rate);
    }
    for (const value of ["0", ".1", "1.01", "4.1", "5.25", "NaN", "Infinity"]) {
      const args = ["--playback-rate", value];
      expect(() => parse(["--output", "/tmp/p", ...args])).toThrow(/playback-rate/);
      expect(() => parseBrowser(args)).toThrow(/playback-rate/);
    }
    expect(() => parse(["--output", "/tmp/p", "--playback-rate"])).toThrow(/requires a value/);
    expect(() => parse(["--output", "/tmp/p", "--playback-rate", "4", "--playback-rate", "1"])).toThrow(/Duplicate/);
  });

  it("uses measured UI capacity to ramp toward 4× instead of trusting the slider maximum", async () => {
    let rate = 1, readiness = 0;
    const capacities = [null, 2, 4];
    const press = vi.fn(async (key: string) => { rate += key === "ArrowRight" ? .25 : -.25; });
    const slider = { getAttribute: async () => "5", inputValue: async () => String(rate), focus: async () => {}, press };
    const page = {
      getByTestId: (id: string) => id === "v3-playback-rate-slider" ? slider
        : id === "v3-playback-rate-trigger" ? { click: async () => {} } : { count: async () => 0 },
      evaluate: async () => capacities[readiness],
      waitForTimeout: async () => { readiness++; },
    } as unknown as Page;
    const result = await selectMeasuredPlaybackRateV1(page, 4);
    expect(result.targetRate).toBe(4);
    expect(result.observations.map(observation => observation.selectedRate)).toEqual([1, 2, 4]);
    expect(result.observations.map(observation => observation.sliderMaximumRate)).toEqual([5, 5, 5]);
    expect(press).toHaveBeenCalledTimes(12);
    expect(press.mock.calls.every(([key]) => key === "ArrowRight")).toBe(true);
  });

  const frame = (functionName: string, lineNumber: number) => ({ functionName, lineNumber, columnNumber: 0, url: "artifact.mjs" });
  const profile = (): CardiorespiratoryCpuProfileV1 => ({ startTime: 1000, endTime: 4000,
    nodes: [{ id: 1, callFrame: frame("root", 0), children: [2, 4] },
      { id: 2, callFrame: frame("solver", 10), children: [3] }, { id: 3, callFrame: frame("solver", 10) },
      { id: 4, callFrame: frame("idle", 20) }], samples: [3, 4, 2], timeDeltas: [1000, 500, 1500] });

  it("aggregates source frames and prevents recursive inclusive double counting", () => {
    const result = summarize(profile());
    expect(result.sampleCount).toBe(3); expect(result.sampledDurationMs).toBe(3); expect(result.profileDurationMs).toBe(3);
    expect(result.rankedSelf.find(row => row.functionName === "solver")).toMatchObject({ selfMs: 2.5, inclusiveMs: 2.5, line: 11, column: 1 });
    expect(result.rankedInclusive[0]).toMatchObject({ functionName: "root", selfMs: 0, inclusiveMs: 3 });
    expect(result.rankedSelf.find(row => row.functionName === "idle")?.selfMs).toBe(.5);
  });

  it("rejects malformed samples and cyclic/ambiguous stack ownership", () => {
    expect(() => summarize({ ...profile(), timeDeltas: [1000] })).toThrow(/misaligned/);
    expect(() => summarize({ ...profile(), samples: [100, 4, 2] })).toThrow(/unknown node/);
    const cyclic = profile(); cyclic.nodes[2]!.children = [1];
    expect(() => summarize(cyclic)).toThrow(/cycle/);
    const multiple = profile(); multiple.nodes[3]!.children = [3];
    expect(() => summarize(multiple)).toThrow(/multiple parents/);
  });

  it("routes profile RPC only to its attached Worker and cleans listeners on disposal", async () => {
    const events = new EventEmitter();
    const send = vi.fn(async () => ({}));
    const cdp = Object.assign(events, { send }) as unknown as CDPSession;
    const rpc = new CardiorespiratoryWorkerCdpRpcV1(cdp, "numerical-worker-session");
    try {
      const request = rpc.send("Profiler.enable");
      expect(send).toHaveBeenCalledWith("Target.sendMessageToTarget", { sessionId: "numerical-worker-session",
        message: JSON.stringify({ id: 1, method: "Profiler.enable", params: {} }) });
      events.emit("Target.receivedMessageFromTarget", { sessionId: "render-worker-session", message: JSON.stringify({ id: 1, result: { wrong: true } }) });
      events.emit("Target.receivedMessageFromTarget", { sessionId: "numerical-worker-session", message: JSON.stringify({ id: 1, result: { enabled: true } }) });
      await expect(request).resolves.toEqual({ enabled: true });
      const failing = rpc.send("Profiler.start");
      events.emit("Target.receivedMessageFromTarget", { sessionId: "numerical-worker-session", message: JSON.stringify({ id: 2, error: { message: "stopped" } }) });
      await expect(failing).rejects.toThrow("stopped");
    } finally { rpc.dispose(); }
    expect(events.listenerCount("Target.receivedMessageFromTarget")).toBe(0);
    await expect(rpc.send("Profiler.start")).rejects.toThrow(/disposed/);
  });
});

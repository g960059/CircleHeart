import { parentPort, workerData } from "node:worker_threads";
import { CardiorespiratorySessionV1, type CardiorespiratoryCheckpointV2 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import type { CardiorespiratoryFixtureV1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";
import { selectHotPathIntegrityTierV1 } from "@/engine/hotPathIntegrityTierV1";

// Every worker owns exactly one independent accepted trajectory. Parallelism
// changes neither its step size nor its sequence of presentation boundaries.
selectHotPathIntegrityTierV1("hot-path-lean");
const input = workerData as { fixture: CardiorespiratoryFixtureV1; checkpoint: CardiorespiratoryCheckpointV2 };
const session = CardiorespiratorySessionV1.restore(input.fixture, input.checkpoint);
parentPort!.on("message", (message: { count: number; intervalSec: number }) => {
  try {
    if (!Number.isSafeInteger(message.count) || message.count < 1 || message.count > 120
      || !Number.isFinite(message.intervalSec) || message.intervalSec <= 0 || message.intervalSec > 1) throw new Error("Invalid preparation worker batch");
    const samples = [];
    for (let i = 0; i < message.count; i++) {
      session.advanceToPresentationTime(session.currentAcceptedClock().acceptedTimeSec + message.intervalSec);
      samples.push(session.physicalSettlementProjectionV1());
    }
    parentPort!.postMessage({ status: "completed", samples, checkpoint: session.checkpoint() });
  } catch (error) { parentPort!.postMessage({ status: "failed", error: error instanceof Error ? error.message : String(error) }); }
});

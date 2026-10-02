import { build } from "esbuild";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { Worker } from "node:worker_threads";
import type { CardiorespiratoryCheckpointV2 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import type { CardiorespiratoryFixtureV1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";
import type { CardiorespiratorySettlementProjectionV1 } from "@/engine/cardiorespiratory/CardiorespiratorySettlementStateV1";

export type CardiorespiratoryPreparationBatchV1 = Readonly<{
  samples: readonly CardiorespiratorySettlementProjectionV1[];
  checkpoint: CardiorespiratoryCheckpointV2;
}>;
/** Offline-only bounded worker pool. This is not the browser live runtime. */
export async function createCardiorespiratoryPreparationWorkersV1(input: Readonly<{
  root: string; outputDirectory: string; fixture: CardiorespiratoryFixtureV1;
  checkpoints: readonly CardiorespiratoryCheckpointV2[];
}>) {
  if (input.checkpoints.length < 1 || input.checkpoints.length > 3) throw new Error("Preparation admits at most three independent workers");
  const result = await build({ absWorkingDir: input.root, entryPoints: ["tools/scientific/CardiorespiratoryPreparationWorkerV1.ts"],
    bundle: true, write: false, platform: "node", format: "esm", target: "es2022", alias: { "@": input.root }, logLevel: "silent",
    define: { "import.meta.env.VITE_CIRCLEHEART_HOT_PATH_INTEGRITY": '"hot-path-lean"' } });
  const workerFile = path.join(input.outputDirectory, "preparation-worker.mjs");
  await writeFile(workerFile, result.outputFiles[0]!.contents);
  const workers = input.checkpoints.map(checkpoint => new Worker(workerFile, { workerData: { fixture: input.fixture, checkpoint } }));
  let active = false, closed = false;
  return {
    async advance(count: number, intervalSec: number): Promise<readonly CardiorespiratoryPreparationBatchV1[]> {
      if (closed || active) throw new Error("Preparation workers are closed or busy");
      active = true;
      try {
        return await Promise.all(workers.map(worker => new Promise<CardiorespiratoryPreparationBatchV1>((resolve, reject) => {
          const cleanup = () => { worker.off("message", message); worker.off("error", error); worker.off("exit", exit); };
          const error = (e: Error) => { cleanup(); reject(e); };
          const exit = (code: number) => error(new Error(`Preparation worker exited before replying (${code})`));
          const message = (value: CardiorespiratoryPreparationBatchV1 & { status: string; error?: string }) => {
            cleanup();
            if (value.status !== "completed" || value.samples.length !== count) reject(new Error(value.error ?? "Incomplete preparation worker batch"));
            else resolve(value);
          };
          worker.once("message", message); worker.once("error", error); worker.once("exit", exit);
          worker.postMessage({ count, intervalSec });
        })));
      } finally { active = false; }
    },
    async close() { if (closed) return; closed = true; await Promise.all(workers.map(w => w.terminate())); },
  };
}

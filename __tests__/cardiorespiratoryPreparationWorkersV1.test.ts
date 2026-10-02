import { it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CardiorespiratorySessionV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { hotPathIntegrityTierV1, selectHotPathIntegrityTierV1 } from "@/engine/hotPathIntegrityTierV1";
import { createCardiorespiratoryPreparationWorkersV1 } from "@/tools/scientific/CardiorespiratoryPreparationWorkersV1";

it("parallel offline histories preserve every accepted checkpoint and observation of serial continuation", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "circleheart-settlement-workers-"));
  const previous = hotPathIntegrityTierV1();
  selectHotPathIntegrityTierV1("hot-path-lean");
  let pool: Awaited<ReturnType<typeof createCardiorespiratoryPreparationWorkersV1>> | null = null;
  try {
    const reference = CardiorespiratorySessionV1.create();
    const sessions = [reference, reference.forkSettlementSeedV1({ systemicGasPressureOffsetMmHg: { co2: 2 }, venousRedistributionMl: 20 })];
    pool = await createCardiorespiratoryPreparationWorkersV1({ root: process.cwd(), outputDirectory: directory,
      fixture: reference.fixture, checkpoints: sessions.map(s => s.checkpoint()) });
    for (const count of [10, 5]) {
      const actual = await pool.advance(count, .5);
      sessions.forEach((s, history) => {
        const expected = [];
        for (let i = 0; i < count; i++) {
          s.advanceToPresentationTime(s.currentAcceptedClock().acceptedTimeSec + .5);
          expected.push(s.physicalSettlementProjectionV1());
        }
        expect(actual[history]!.samples).toEqual(expected);
        expect(actual[history]!.checkpoint).toEqual(s.checkpoint());
      });
    }
  } finally {
    await pool?.close();
    selectHotPathIntegrityTierV1(previous);
    await rm(directory, { recursive: true, force: true });
  }
}, 120_000);

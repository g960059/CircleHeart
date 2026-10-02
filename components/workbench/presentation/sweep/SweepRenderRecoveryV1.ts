import { SweepDeltaEncoderV1, type SweepRenderFrameV1, type SweepRenderResultV1 } from "./SweepRenderProtocolV1";
import { SweepRenderModelV1 } from "./SweepRenderModelV1";

export type SweepRenderSnapshotKeyV1 = Readonly<{ input: object; samples: readonly object[]; dimensionsAndTheme: string }>;
/** An encoder and its local receiver must resynchronize together after failure.
 * Repeated notifications for the same failed immutable snapshot do not retry;
 * the next changed data/configuration snapshot gets a fresh full transfer. */
export class SweepRenderRecoveryV1 {
  readonly encoder = new SweepDeltaEncoderV1();
  #model = new SweepRenderModelV1();
  #failed: SweepRenderSnapshotKeyV1 | undefined;
  canAttempt(key: SweepRenderSnapshotKeyV1): boolean {
    const failed = this.#failed;
    return !failed || failed.input !== key.input || failed.dimensionsAndTheme !== key.dimensionsAndTheme
      || failed.samples.length !== key.samples.length || failed.samples.some((samples, i) => samples !== key.samples[i]);
  }
  reject(key: SweepRenderSnapshotKeyV1 | undefined): void {
    this.encoder.reset(); this.#model = new SweepRenderModelV1(); this.#failed = key;
  }
  accept(): void { this.#failed = undefined; }
  paint(frame: SweepRenderFrameV1, context: CanvasRenderingContext2D): SweepRenderResultV1 {
    this.#model.apply(frame); return this.#model.draw(context);
  }
}

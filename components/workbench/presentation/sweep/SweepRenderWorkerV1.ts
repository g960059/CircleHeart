import { SweepRenderWorkerRuntimeV1, type SweepWorkerRequestV1, type SweepWorkerResponseV1 } from "./SweepRenderWorkerRuntimeV1";
const scope = globalThis as unknown as { onmessage: (event: MessageEvent<SweepWorkerRequestV1>) => void;
  postMessage(message: SweepWorkerResponseV1): void };
const runtime = new SweepRenderWorkerRuntimeV1(response => scope.postMessage(response));
scope.onmessage = event => runtime.handle(event.data);

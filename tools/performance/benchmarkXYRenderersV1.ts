import { chromium, type Browser } from "@playwright/test";
import { createServer } from "vite";
import path from "node:path";
import { cpus } from "node:os";

const argument = (name: string, fallback: number, minimum: number, maximum: number, integer = false) => {
  const index = process.argv.indexOf(name), value = index < 0 ? fallback : Number(process.argv[index + 1]);
  if (!Number.isFinite(value) || value < minimum || value > maximum || (integer && !Number.isSafeInteger(value))) {
    throw new Error(`${name} must be ${integer ? "an integer " : ""}in ${minimum}..${maximum}`);
  }
  return value;
};
const frames = argument("--frames", 180, 1, 10000, true), pixelRatio = argument("--dpr", 2, .5, 4);
const headed = process.argv.includes("--headed");
const server = await createServer({ configFile: false, root: process.cwd(), appType: "custom",
  optimizeDeps: { noDiscovery: true },
  resolve: { alias: { "@": path.resolve(".") } }, server: { host: "127.0.0.1", port: 0, hmr: false },
  plugins: [{ name: "xy-renderer-comparison-page", configureServer(instance) {
    // Install before Vite's middleware; the repository's SPA and router must
    // never own this isolated renderer experiment or trigger a navigation.
    instance.middlewares.use("/__xy-renderer-comparison", (_request, response) => {
      response.setHeader("Content-Type", "text/html");
      response.end('<!doctype html><meta charset="utf-8"><title>XY renderer comparison</title><body style="margin:0;background:#101827"></body>');
    });
  } }],
});
let browser: Browser | undefined;
try {
  await server.listen();
  const address = server.httpServer!.address();
  if (!address || typeof address === "string") throw new Error("Missing local comparison server");
  browser = await chromium.launch({ headless: !headed });
  const page = await browser.newPage({ viewport: { width: 1240, height: 750 }, deviceScaleFactor: pixelRatio });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}/__xy-renderer-comparison`);
  if (await page.title() !== "XY renderer comparison") throw new Error("Comparison page was replaced by the application");
  // Keep import() inside browser source text: vite-node would otherwise
  // rewrite the serialized evaluate callback to an SSR-only import helper.
  const result = await page.evaluate(`(async () => {
    const module = await import("/tools/performance/xyRendererComparisonBrowserV1.ts");
    return module.compareXYRenderersV1(${JSON.stringify({ frames, pixelRatio })});
  })()`);
  if (errors.length) throw new Error(errors.join("; "));
  if (result === null || typeof result !== "object" || Array.isArray(result)
    || !("schemaId" in result) || result.schemaId !== "circleheart-xy-renderer-comparison-v1") {
    throw new Error("Invalid renderer comparison result");
  }
  console.log(JSON.stringify({ ...result, host: { cpus: [...new Set(cpus().map(cpu => cpu.model))] },
    browser: await browser.version(), headed }, null, 2));
} finally {
  try { await browser?.close(); } finally { await server.close(); }
}

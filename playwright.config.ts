import { defineConfig } from "@playwright/test";

// A separate build/port can verify browser-local persistence without touching a configured remote database.
const previewPort = process.env.CIRCLEHEART_E2E_PORT ?? "4173";
const previewBaseUrl = `http://127.0.0.1:${previewPort}`;
const previewOutputDirectory = process.env.CIRCLEHEART_E2E_DIST;

export default defineConfig({
  testDir: "./e2e",
  // Public-content fixtures require a configured repository; the local numerical suite does not.
  testIgnore: ["**/courses-v1.spec.ts", "**/article-loading-v1.spec.ts", "**/workbench-publication-v3.spec.ts", "**/header-auth-loading-v3.spec.ts"],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  // Each project autostarts an exact V3 numerical Worker. Shared CI runners
  // cannot provide a meaningful playback-rate signal while desktop and mobile
  // simulations compete for the same CPU, so preserve the threshold and
  // serialize projects only in CI.
  workers: process.env.CI ? 1 : undefined,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: previewBaseUrl,
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${previewPort}${previewOutputDirectory ? ` --outDir ${JSON.stringify(previewOutputDirectory)}` : ""}`,
    url: `${previewBaseUrl}/ja/experiments`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      grep: /@desktop/,
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-chromium",
      grep: /@mobile/,
      use: { viewport: { width: 390, height: 844 } },
    },
    {
      name: "desktop-webkit",
      grep: /@webkit/,
      use: {
        browserName: "webkit",
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});

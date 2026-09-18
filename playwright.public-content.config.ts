import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: ["**/courses-v1.spec.ts", "**/article-loading-v1.spec.ts", "**/workbench-publication-v3.spec.ts", "**/header-auth-loading-v3.spec.ts"],
});

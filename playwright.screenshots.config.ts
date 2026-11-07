import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

// README / 作品集截圖:`pnpm screenshots`,輸出到 docs/screenshots/。
// 沿用 E2E 的 wrangler 伺服器與 globalSetup(建立臨時 staff 帳號,結束後清除)。
export default defineConfig({
  ...base,
  testDir: "tests/screenshots",
  testMatch: "**/*.capture.ts",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});

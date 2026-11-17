import { defineConfig, devices } from "@playwright/test";
import { localSupabase } from "./tests/e2e/support/local-supabase";
import { MAIL_API_KEY, MAIL_PORT } from "./tests/e2e/support/mail";

export const TURNSTILE_TEST_SECRET_PASS = "1x0000000000000000000000000000000AA";
export const TURNSTILE_TEST_SECRET_FAIL = "2x0000000000000000000000000000000AA";

const PORT = 8788;
export const TURNSTILE_FAIL_PORT = 8789;

const supabase = localSupabase();

function pagesDev(port: number, turnstileSecret: string) {
  return {
    command: [
      "pnpm exec wrangler pages dev",
      `--port ${port} --ip localhost`,
      `--binding NEXT_PUBLIC_SUPABASE_URL=${supabase.url}`,
      `--binding SUPABASE_SERVICE_ROLE_KEY=${supabase.serviceKey}`,
      `--binding TURNSTILE_SECRET_KEY=${turnstileSecret}`,
      `--binding RESEND_API_KEY=${MAIL_API_KEY}`,
      `--binding "EMAIL_FROM=Morning Brew Demo <reservations@e2e.test>"`,
      `--binding EMAIL_API_URL=http://localhost:${MAIL_PORT}`,
    ].join(" "),
    url: `http://localhost:${port}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  };
}

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/e2e/support/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "node tests/e2e/support/mail-server.mjs",
      url: `http://localhost:${MAIL_PORT}/`,
      env: { MAIL_PORT: String(MAIL_PORT), MAIL_API_KEY },
      reuseExistingServer: !process.env.CI,
    },
    pagesDev(PORT, TURNSTILE_TEST_SECRET_PASS),
    pagesDev(TURNSTILE_FAIL_PORT, TURNSTILE_TEST_SECRET_FAIL),
  ],
});

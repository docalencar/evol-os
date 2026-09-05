import { defineConfig, devices } from "@playwright/test"

import { e2eEnv } from "./e2e/helpers/env"

/**
 * Playwright configuration for authenticated Review E2E.
 *
 * `e2eEnv()` validates the target and throws before Playwright starts if the run
 * points anywhere but Review — so a mis-set variable fails at config load, ahead of
 * any browser or fixture.
 */
const env = e2eEnv()

export default defineConfig({
  testDir: "./e2e/specs",
  outputDir: "./e2e/.run/artifacts",

  // Review fixtures are mutation-heavy and tenant-scoped; serial by default.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  timeout: 60_000,
  expect: { timeout: 15_000 },

  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  reporter: [
    ["list"],
    ["html", { outputFolder: "./e2e/.run/report", open: "never" }],
  ],

  use: {
    baseURL: env.baseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Video is deliberately off: it adds weight and would capture the typed
    // password keystroke-by-keystroke. Trace + screenshot are enough to debug.
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "identity",
      testMatch: /00-target-identity\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated",
      testMatch: /\d\d-(?!target-identity)[\w-]+\.spec\.ts/,
      dependencies: ["identity"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})

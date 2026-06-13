import { defineConfig, devices } from "@playwright/test"

const mockedSpecs = [
  "agents-routing",
  "docs",
  "fleet",
  "home-docs",
  "landing",
  "ledger",
  "taskforce-external-links",
  "taskforce-routing",
  "taskforce-shell",
  "v2-document-hash",
  "v2-metrics-session",
  "v2-query-errors",
].join("|")

export default defineConfig({
  testDir: "./tests",
  testMatch: new RegExp(`(${mockedSpecs})\\.spec\\.ts$`),
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    storageState: {
      cookies: [],
      origins: [],
    },
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mocked-chromium",
      use: devices["Desktop Chrome"],
    },
  ],
  webServer: {
    command: process.env.CI
      ? "npm run dev -- --host 127.0.0.1"
      : "bun ./node_modules/vite/bin/vite.js --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
})

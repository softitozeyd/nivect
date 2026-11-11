import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5197",
    headless: true,
    viewport: { width: 1440, height: 1080 },
    screenshot: "only-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
  projects: [
    { name: "demo", testIgnore: "**/api.spec.ts" },
    {
      name: "api-contract",
      testMatch: "**/api.spec.ts",
      use: { baseURL: "http://127.0.0.1:5198" },
    },
  ],
  webServer: [
    {
      command: "npm run dev -- --port 5197 --strictPort",
      url: "http://127.0.0.1:5197",
      reuseExistingServer: true,
    },
    {
      command: "npm run dev:api -- --port 5198 --strictPort",
      url: "http://127.0.0.1:5198",
      env: {
        VITE_DATA_MODE: "api",
        VITE_API_BASE_URL: "",
        VITE_BACKEND_TARGET: "http://127.0.0.1:18080",
      },
      reuseExistingServer: false,
    },
    {
      command: "node tests/fixtures/nivect-server.mjs",
      url: "http://127.0.0.1:18080/actuator/health",
      reuseExistingServer: false,
    },
  ],
});

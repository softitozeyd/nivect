import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: "list",
  use: {
    baseURL: process.env.NIVECT_UI_URL || "http://127.0.0.1:5173",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ||
        (process.env.CI ? undefined : "/usr/bin/chromium"),
      args: [
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
  },
});

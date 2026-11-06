import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import process from "node:process";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_DATA_MODE": JSON.stringify(
        mode === "api" ? "api" : env.VITE_DATA_MODE || "demo",
      ),
    },
    server: {
      proxy: {
        "/api": {
          target: env.VITE_BACKEND_TARGET || "http://127.0.0.1:8080",
          changeOrigin: true,
        },
        "/actuator/health": {
          target: env.VITE_BACKEND_TARGET || "http://127.0.0.1:8080",
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
    },
  };
});

import { defineConfig } from "@playwright/test";

// Assume os servidores de dev já rodando: Vite em :8081 (proxy /api) e o
// backend financial/server em :3001. Não sobe webServer para não conflitar
// com a sessão de desenvolvimento.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8081",
    channel: "chrome",
    viewport: { width: 1280, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});

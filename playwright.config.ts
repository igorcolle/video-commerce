import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const ADMIN_STATE = path.join(__dirname, "tests", ".auth", "admin.json");

// =====================================================================
// Configuração do Playwright — rede de segurança (regressão visual + E2E).
// Sobe DOIS servidores: o mock do Supabase (porta 54321) e o app Next em
// produção (porta 3100) apontando para o mock via env. O app de produção
// NÃO muda — as envs de teste só valem nesta execução.
// =====================================================================

const APP_PORT = 3100;
const MOCK_PORT = 54321;
const baseURL = `http://127.0.0.1:${APP_PORT}`;

// Envs que o app Next recebe nos testes (mock no lugar do Supabase real).
const testEnv = {
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-test-key",
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" },
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    actionTimeout: 10_000,
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },

    // Lógica pura (sem navegador de verdade, mas sem dep de login).
    { name: "unit", testMatch: "unit/**/*.spec.ts" },

    // Player público — sem autenticação.
    {
      name: "public-desktop",
      testMatch: ["visual/player.spec.ts", "visual/login.spec.ts", "e2e/player.spec.ts"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "public-mobile",
      testMatch: ["visual/player.spec.ts", "visual/login.spec.ts", "e2e/player.spec.ts"],
      use: { ...devices["iPhone 12"], browserName: "chromium" },
    },

    // Admin — usa a sessão salva pelo setup (login).
    {
      name: "admin-desktop",
      testMatch: ["visual/admin.spec.ts", "e2e/admin.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        storageState: ADMIN_STATE,
      },
      dependencies: ["setup"],
    },
    {
      name: "admin-mobile",
      testMatch: ["visual/admin.spec.ts", "e2e/admin.spec.ts"],
      use: { ...devices["iPhone 12"], browserName: "chromium", storageState: ADMIN_STATE },
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      command: "npm run test:mock",
      url: `http://127.0.0.1:${MOCK_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npm run build && npm run test:start",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: testEnv,
    },
  ],
});

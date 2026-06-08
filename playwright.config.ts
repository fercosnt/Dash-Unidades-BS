import { defineConfig, devices } from "@playwright/test";
import { readFileSync, existsSync } from "fs";

/**
 * Playwright E2E — Beauty Smile Partners Dashboard.
 *
 * Roda contra o dev server local (`npm run dev`, porta 3000) usando o .env.local
 * atual (que aponta para o Supabase de produção). Os testes desta suíte são
 * READ-ONLY: login, navegação, isolamento RLS e smoke das páginas — nada que grave
 * dado. Não adicionar testes de escrita aqui sem um ambiente isolado (Supabase local).
 *
 * Credenciais de teste via env (NÃO commitar): copie de .env.example para .env.e2e
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 *   E2E_PARCEIRO_EMAIL / E2E_PARCEIRO_PASSWORD
 */

// Loader de env minimalista (sem dependência de dotenv).
function loadEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}
loadEnv(".env.e2e");

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Faz login uma vez por papel e salva o storageState.
    { name: "setup", testMatch: /auth\.setup\.ts/ },

    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],

  // Sobe um BUILD DE PRODUÇÃO local (pré-compilado): rápido e sem o flakiness do
  // cold-compile do `next dev`. Continua usando o .env.local (Supabase prod).
  // Reaproveita um servidor já rodando em 3000 (ex.: `npm run build && npm start`).
  webServer: {
    command: "npm run build && npm run start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});

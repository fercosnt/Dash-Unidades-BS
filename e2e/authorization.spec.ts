import { test, expect } from "@playwright/test";
import { ADMIN_STATE, PARCEIRO_STATE } from "./helpers";

/**
 * Validação ponta-a-ponta da autorização por papel (complementa a auditoria de RLS):
 * o parceiro NÃO pode acessar a área /admin; o admin pode.
 */

test.describe("Autorização — parceiro", () => {
  test.use({ storageState: PARCEIRO_STATE });

  test("parceiro é barrado da área admin (redireciona p/ parceiro)", async ({ page }) => {
    await page.goto("/admin/dashboard");
    // O AdminLayout deve redirecionar não-admin para /parceiro/dashboard.
    await expect(page).toHaveURL(/\/parceiro\/dashboard/);
    // Garante que não está vendo conteúdo do painel admin.
    await expect(page).not.toHaveURL(/\/admin\//);
  });

  test("parceiro acessa o próprio dashboard", async ({ page }) => {
    await page.goto("/parceiro/dashboard");
    await expect(page).toHaveURL(/\/parceiro\/dashboard/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
});

test.describe("Autorização — admin", () => {
  test.use({ storageState: ADMIN_STATE });

  test("admin acessa a área admin", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { creds, login } from "./helpers";

// Contexto sem sessão (ignora os storageState do setup).
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Autenticação", () => {
  test("rota protegida sem login redireciona para /login", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("credenciais inválidas mostram erro", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("naoexiste@exemplo.com");
    await page.locator("#password").fill("senhaerrada123");
    await page.getByRole("button", { name: /entrar|login|acessar/i }).click();
    await expect(page.getByText(/incorret|inválid|invalid/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin loga e cai no /admin/dashboard", async ({ page }) => {
    const { email, password } = creds.admin();
    await login(page, email, password);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test("parceiro loga e cai no /parceiro/dashboard", async ({ page }) => {
    const { email, password } = creds.parceiro();
    await login(page, email, password);
    await expect(page).toHaveURL(/\/parceiro\/dashboard/);
  });
});

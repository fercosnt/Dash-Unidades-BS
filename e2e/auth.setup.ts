import { test as setup } from "@playwright/test";
import { ADMIN_STATE, PARCEIRO_STATE, creds, login } from "./helpers";

/**
 * Faz login com cada papel UMA vez e salva o storageState (cookies de sessão),
 * reutilizado pelos specs via `test.use({ storageState })`. Roda no projeto "setup",
 * dependência dos demais.
 */

setup("autenticar como admin", async ({ page }) => {
  const { email, password } = creds.admin();
  await login(page, email, password);
  await page.context().storageState({ path: ADMIN_STATE });
});

setup("autenticar como parceiro", async ({ page }) => {
  const { email, password } = creds.parceiro();
  await login(page, email, password);
  await page.context().storageState({ path: PARCEIRO_STATE });
});

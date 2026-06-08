import { test } from "@playwright/test";
import { ADMIN_STATE, ADMIN_PAGES, assertPageLoads } from "./helpers";

/** Smoke: cada página principal do admin carrega sem erro e renderiza conteúdo. */
test.describe("Smoke admin", () => {
  test.use({ storageState: ADMIN_STATE });

  for (const path of ADMIN_PAGES) {
    test(`carrega ${path}`, async ({ page }) => {
      await assertPageLoads(page, path);
    });
  }
});

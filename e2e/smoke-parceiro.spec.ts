import { test } from "@playwright/test";
import { PARCEIRO_STATE, PARCEIRO_PAGES, assertPageLoads } from "./helpers";

/** Smoke: cada página principal do parceiro carrega sem erro e renderiza conteúdo. */
test.describe("Smoke parceiro", () => {
  test.use({ storageState: PARCEIRO_STATE });

  for (const path of PARCEIRO_PAGES) {
    test(`carrega ${path}`, async ({ page }) => {
      await assertPageLoads(page, path);
    });
  }
});

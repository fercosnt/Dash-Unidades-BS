import { type Page, expect } from "@playwright/test";

/** Caminhos dos storageState gerados pelo auth.setup.ts */
export const ADMIN_STATE = "e2e/.auth/admin.json";
export const PARCEIRO_STATE = "e2e/.auth/parceiro.json";

/** Lê credencial obrigatória do env (.env.e2e). Falha com mensagem clara se faltar. */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Variável de ambiente ${name} não definida. Copie .env.example -> .env.e2e e preencha as credenciais de teste.`,
    );
  }
  return v;
}

export const creds = {
  admin: () => ({ email: requireEnv("E2E_ADMIN_EMAIL"), password: requireEnv("E2E_ADMIN_PASSWORD") }),
  parceiro: () => ({ email: requireEnv("E2E_PARCEIRO_EMAIL"), password: requireEnv("E2E_PARCEIRO_PASSWORD") }),
};

/** Faz login pela UI e espera o redirect para o dashboard do papel. */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /entrar|login|acessar/i }).click();
  // middleware redireciona para /admin/dashboard ou /parceiro/dashboard
  await page.waitForURL(/\/(admin|parceiro)\/dashboard/, { timeout: 15_000 });
}

/** Páginas principais do admin (smoke). */
export const ADMIN_PAGES = [
  "/admin/dashboard",
  "/admin/fechamento",
  "/admin/pagamentos",
  "/admin/inadimplencia",
  "/admin/repasses",
  "/admin/comissoes-dentista",
  "/admin/comissoes",
  "/admin/despesas",
  "/admin/upload",
  "/admin/configuracoes/clinicas",
  "/admin/configuracoes/procedimentos",
  "/admin/configuracoes/medicos",
  "/admin/configuracoes/financeiro",
  "/admin/configuracoes/debitos",
  "/admin/configuracoes/categorias-despesa",
  "/admin/configuracoes/taxas-cartao",
  "/admin/configuracoes/dentistas",
  "/admin/configuracoes/usuarios",
];

/** Páginas principais do parceiro (smoke). */
export const PARCEIRO_PAGES = [
  "/parceiro/dashboard",
  "/parceiro/orcamentos",
  "/parceiro/financeiro",
  "/parceiro/inadimplencia",
];

/**
 * Smoke de uma página: navega, confirma que NÃO foi jogado pro /login e que a
 * página renderizou conteúdo real (algum heading) sem erro fatal do Next.
 */
export async function assertPageLoads(page: Page, path: string) {
  const resp = await page.goto(path, { waitUntil: "domcontentloaded" });

  // Não pode ter sido redirecionado para o login (sessão válida).
  expect(page.url(), `${path} redirecionou para /login`).not.toContain("/login");

  // Sem erro de servidor.
  if (resp) expect(resp.status(), `${path} retornou ${resp.status()}`).toBeLessThan(400);

  // Sem error boundary do Next.
  await expect(
    page.getByText(/Application error|Internal Server Error|This page could not be found/i),
  ).toHaveCount(0);

  // Renderizou algum heading (conteúdo real).
  await expect(page.locator("h1, h2").first()).toBeVisible();
}

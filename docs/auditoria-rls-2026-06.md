# Auditoria de RLS / Multi-tenancy — 2026-06-07

Validação do isolamento multi-tenant (admin vê tudo; parceiro vê só a própria
clínica, somente leitura). Projeto Supabase `fywopbgtqueoplqdegrw`. Testado
simulando o JWT do usuário parceiro real (`parceiro@beautysmile.com.br`).

## ✅ Aprovado — isolamento de LEITURA está sólido

- **RLS habilitado nas 23 tabelas** do schema `public`.
- **Padrão consistente** em toda tabela de dados: `admin_full_access` (`is_admin()`)
  + `parceiro_read_own` (SELECT `clinica_id = auth_clinica_id()`). O parceiro
  **não tem nenhuma policy de INSERT/UPDATE/DELETE** → writes negados pelo RLS.
- **Teste cross-tenant real:** o parceiro está mapeado para a clínica
  `fa83c5e2-…` e todos os dados são da Hirata (`d543b244-…`). Simulando o JWT do
  parceiro, as contagens vieram **todas 0** (pagamentos, resumo, orçamentos,
  parcelas, despesas, clínicas) — prova que ele **não enxerga** dados de outra
  clínica. `comissoes_dentista` é admin-only (parceiro nem a própria vê — correto).
- `calcular_resultado_mensal_parceiro` tem guard correto
  (`is_admin() OR auth_clinica_id() = p_clinica_id`).

## 🔴 Furos de ESCRITA encontrados e CORRIGIDOS (migration 026)

As funções `SECURITY DEFINER` **bypassam o RLS** e estavam concedidas a
`anon`/`authenticated` **sem guard interno**. Um parceiro (ou anon com a anon key)
podia chamá-las direto no PostgREST (`/rest/v1/rpc/...`), pulando as rotas Next que
checam admin. **Comprovado na prática** simulando o JWT do parceiro:

| RPC | Antes (parceiro) | Depois (parceiro) | Impacto evitado |
|---|---|---|---|
| `registrar_pagamento` | rodava (P0001) | **42501 Acesso negado** | criar pagamentos |
| `estornar_pagamento` | rodava (P0001) | **42501 Acesso negado** | deletar pagamentos |
| `auto_receber_parcelas_cartao` | executava | **42501 / sem EXECUTE** | virar parcelas de todas as clínicas |

**Fix (migration 026):**
- Guard interno em cada uma: `IF NOT (coalesce(is_admin(),false) OR auth.jwt()->>'role'='service_role') THEN RAISE EXCEPTION ... '42501'`.
  Validado nos 4 papéis: **admin** e **service_role** passam (sync/n8n/rotas admin
  intactos); **parceiro** e **anon** bloqueados.
- `REVOKE EXECUTE` do `anon`/`public` nas 3; `auto_receber` revogado também de
  `authenticated` (só `service_role`, pois só o n8n WF3 a chama).

## 🔴 `sync_logs` — policies permissivas CORRIGIDAS (migration 026)

`sync_logs_admin_insert` (INSERT) e `sync_logs_admin_update` (UPDATE) estavam
`TO public` com check `true` → qualquer um inseria/atualizava logs (apesar do nome
"admin"). SELECT já era admin-only. **Fix:** recriadas como `TO authenticated`
com `is_admin()`. O app escreve via service role (bypassa RLS), então não quebra.

## 🟡 Observações (não corrigidas — decisão do usuário)

1. **Usuário parceiro mal-mapeado:** `parceiro@beautysmile.com.br` aponta para
   `clinica_id = fa83c5e2-…`, que **não existe** em `clinicas_parceiras`. Por isso
   ele não vê nenhum dado real. Se o objetivo é testar a view do parceiro com dados
   reais, remapear para a Hirata (`d543b244-…`). **Não é furo de segurança** (erra
   pro lado seguro: vê menos), mas impede o smoke-test do parceiro.
2. **Leaked Password Protection desabilitado** (Supabase Auth). Recomendado ligar
   no painel: Authentication → Policies → "Leaked password protection" (checa
   HaveIBeenPwned). Não dá pra ligar via migration.
3. **Advisors residuais (aceitáveis):** `is_admin()`/`auth_clinica_id()` continuam
   executáveis por anon/authenticated — **necessário**, pois o RLS as chama na
   avaliação das policies (retornam null/false p/ anon). `registrar`/`estornar`/
   `calcular` executáveis por authenticated — **necessário** (rotas admin e view do
   parceiro usam sessão de usuário) e agora **protegidos por guard interno**.

## Arquivos
- [`supabase/migrations/026_rls_hardening_rpcs_security_definer.sql`](../supabase/migrations/026_rls_hardening_rpcs_security_definer.sql)

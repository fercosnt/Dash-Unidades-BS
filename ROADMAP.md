# Roadmap — Beauty Smile Partners Dashboard

## Fases Concluídas

### ✅ Fase 1 — Fundação
- 6 migrations SQL: schema completo, RLS policies, colunas adicionais, RPC functions
- Auth (login/logout) com middleware e proteção de rotas por role (admin/parceiro)
- Layouts admin e parceiro com sidebar, header e navegação
- CRUDs completos: clínicas parceiras, procedimentos, médicos indicadores, configurações financeiras
- Seed data em `supabase/seed.sql`
- Tema visual Beauty Sleep (sidebar gradiente escuro, header com blur)

### ✅ Fase 2 — Upload e Processamento
- Upload XLSX com parse no browser (ExcelJS), preview e confirmação antes de enviar
- Transformação de dados: split por "+", limpeza de nomes, conversão monetária BR
- API Route `/api/upload/route.ts` (cria batch + dispara webhook n8n)
- Histórico de uploads com filtros e indicadores de status
- Revisão de match de procedimentos: match manual e criação rápida
- Testes unitários: `xlsx-parser`, `xlsx-transforms`, `formatting`

### ✅ Fase 3 — Dashboards
- Dashboard admin: 6 KPI cards, gráficos recharts (barras e linha), ranking de clínicas clicável
- Drill-down por clínica: 4 abas (orçamentos fechados, orçamentos abertos, tratamentos, resumo financeiro)
- Dashboard parceiro: KPIs, gráfico, orçamentos e financeiro (somente leitura, scoped por RLS)
- API Routes `/api/resumo/calcular` e `/api/resumo/recalcular`
- Lógica de cálculo em `lib/resumo-calculo.ts`

### ✅ Fase 4 — Pagamentos e Inadimplência
- RPC functions atômicas: `registrar_pagamento` e `estornar_pagamento`
- API Routes `/api/pagamentos` (POST/DELETE)
- Modal de registro de pagamento com parcelas (D+30, arredondamento correto na última parcela)
- Modal de estorno com confirmação
- Tela de inadimplência admin: KPIs, filtros, ação rápida de pagamento
- Projeção de recebimentos futuros (recharts, 12 meses)
- Dashboard parceiro: inadimplência e projeção (somente leitura)

### ✅ Dashboard Admin V2 — Abas + DRE + Repasse (2026-03-07)
- `types/dashboard.types.ts` — 7 novos tipos (`KpisAdminV2`, `DreAdminData`, `RepasseAdminData`, etc.)
- `lib/dashboard-queries.ts` — 7 novas funções de query paralelas
- `components/dashboard/KpiCard.tsx` — prop `subtitle` opcional
- `DreCascata.tsx`, `RepasseMes.tsx`, `ChartVendasEvolucao.tsx`, `ChartProcedimentosPizza.tsx` — novos componentes
- `DashboardClient.tsx` — 4 abas (Resumo, Vendas, Procedimentos, Clínicas)

### ✅ n8n Workflows (2026-03-10)
- **WF1/WF2** (`XqHyQR1vemAIwHrz`) — Upload Processing: Webhook → match → `POST /api/resumo/calcular-interno`
- **WF3** (`nkzFTRigOvX8fANH`) — Auto-recebimento parcelas cartão: Schedule 5h, RPC `auto_receber_parcelas_cartao`
- **WF4** — Notificações Telegram: pendente
- Endpoint interno: `app/api/resumo/calcular-interno/route.ts` (auth por `x-service-secret`)

### ✅ Deploy e Infraestrutura
- Deploy Vercel em `dash.bslabs.com.br`
- Variáveis de ambiente configuradas em produção

---

### ✅ V3 — Melhorias Dashboard (2026-03-11)

Plano completo: `docs/plans/2026-03-10-melhorias-dashboard-v3.md`

| # | Feature | Status |
|---|---------|--------|
| 1 | Filtros: meses 2026 + seletor de unidade + auto-recálculo | ✅ `59bd0a1` |
| 2 | Excluir tratamentos na revisão de procedimentos | ✅ `3a0e706` |
| 3 | Baixa de repasse mensal | ✅ `44ed721` |
| 4 | Saldo devedor por unidade (Franquia Fee) | ✅ `ed9476e` |
| 5 | Comissão da dentista — tiers + baixa + DRE | ✅ `3b7edb1` |
| 6 | Página de comissões médicos indicadores | ✅ `462c4ce` |
| 7 | Aba Vendas: tratamentos vendidos | ✅ `98c3c6a` |
| 8 | Exportar PDF | ✅ `2baa71d` |
| 9 | Gráfico evolução por tratamento | ✅ `e626e4f` |

### ✅ Testes abrangentes de cálculos financeiros (2026-03-19)

101 testes unitários cobrindo todos os módulos de cálculo:
- `lib/utils/split-orcamento.test.ts` — 14 testes (distribuição proporcional, centavos, edge cases)
- `lib/utils/match-procedimento.test.ts` — 14 testes (match exato, prefixo, acentos, migration 014)
- `lib/utils/calculos-financeiros.test.ts` — 53 testes (parcelas, resumo 60/40, comissões, migration 014)
- `lib/utils/formatting.test.ts` — 12 testes (moeda BR, datas, nomes)
- `lib/utils/xlsx-parser.test.ts` — 5 testes (parse XLSX)
- `lib/utils/xlsx-transforms.test.ts` — 3 testes (transforms orçamentos/tratamentos)

Bug corrigido: `comissao-dentista-queries.ts` — valorComissao sem arredondamento (floating point)

### ✅ Auditoria de Segurança e Qualidade (2026-03-19)

Auditoria completa com 6 agentes especializados — 52 issues identificados, todos bloqueantes e importantes corrigidos.

**Segurança (CRÍTICO):**
- `lib/auth/require-admin.ts` — guard compartilhado para admin Server Actions
- `requireAdmin()` adicionado em ~40 funções de 13 arquivos de actions
- Role check no `AdminLayout` — parceiro não acessa mais `/admin/*`
- Redirect no parceiro layout quando sessão expira
- Webhook secret aceito apenas via header (removido query param)

**Bugs corrigidos:**
- `custo_fixo` removido do `.map()` em `getProcedimentosAtivos` (KPIs mostravam R$ 0)
- Race condition em `handleConfirmReplace` (substituição nunca funcionava)
- `Number() ?? fallback` → `|| fallback` (NaN não é null)

**Qualidade:**
- `types/database.types.ts` — 1.221 linhas (19 tabelas, 2 views, 5 RPCs, 6 enums)
- Error handling em ~30 queries Supabase — `resumo-calculo.ts` aborta em vez de gravar zeros
- `console.error` em 14 catch blocks vazios nos API routes
- Zod validation em 7 arquivos de admin actions
- N+1 → bulk: `vincularProcedimentoBulk`, `vincularAutomaticamente`, `calcularComissoesMes`
- `lib/utils/date-helpers.ts` — centralizado (removido de 8 arquivos)
- `formatCurrency` centralizado de `lib/utils/formatting.ts` (removido de 13 componentes)
- `eslint.config.mjs` — ESLint 9 flat config (Next.js + TypeScript + React Hooks)
- CLAUDE.md corrigido: comissão médica é sobre valor bruto

### Auditoria Visual + Correções (2026-03-20)

Auditoria visual completa via Chrome em produção (16 páginas, zero erros JS no console).

**Correções aplicadas:**
- 5 rotas com 503 no prefetch RSC: `dynamic = 'force-dynamic'`, `maxDuration = 30` e `loading.tsx` com skeleton
- Sidebar mobile: auto-colapsa em <768px, backdrop, hamburger, fecha ao navegar
- `seed.sql` com email real do admin (placeholder removido no Supabase produção)
- Edição de débito parceiro: botão "Editar" + modal para alterar valor total e descrição
- Favicon: `app/icon.svg` com isotipo azul do design system Beauty Smile

### Despesas Operacionais + DRE Beauty Smile (2026-03-20)

Módulo completo para gestão de despesas por unidade e cálculo do resultado real da Beauty Smile.

**Migration 017:**
- 3 novas tabelas: `categorias_despesa`, `despesas_operacionais`, `taxas_cartao_reais`
- Coluna `bandeira` adicionada em `pagamentos` (`visa_master` | `outros`)
- Seed: 9 categorias iniciais + 26 taxas reais (Visa/Master e Outros, crédito 1x-12x + débito)
- RLS: admin full access, parceiro read-only em suas despesas

**Taxas reais de cartão (`/admin/configuracoes/taxas-cartao`):**
- Duas categorias de bandeira: Visa/Mastercard vs Outros (Elo, Amex, etc.)
- Edição inline com vigência automática (fecha anterior, cria nova)
- Taxas reais: Visa/Master débito 0.69%, crédito 1x 1.75%, 2-6x 2.19%, 7-12x 2.53%; Outros débito 1.49%, crédito 1x 2.55%, 2-6x 2.99%, 7-12x 3.33%

**Categorias de despesa (`/admin/configuracoes/categorias-despesa`):**
- CRUD completo com toggle ativo/inativo
- Categorias dinâmicas (admin gerencia, não enum)

**Página de despesas (`/admin/despesas`) — 3 abas:**
- **Aba Recebíveis** — DRE completo base caixa: entradas (PIX/Dinheiro/Cartão/Parcelas) → mesma estrutura do Faturamento usando totalRecebido como base → resultado BS
- **Aba Faturamento** — DRE Beauty Smile: receita BS bruta → taxa real → comissão dentista → despesas → resultado
- **Aba Despesas** — Gestão: cadastro manual, upload XLSX com preview, copiar mês anterior, edição inline

**Cálculos (`lib/despesas-queries.ts`):**
- `calcularTaxaRealCartao()` — pagamentos × taxas reais por bandeira/modalidade/parcelas
- `calcularDreBsUnidade()` — DRE completo: receita BS bruta → taxa real → comissão dentista → despesas → resultado
- `calcularDreRecebiveis()` — DRE caixa completo: entradas → mesma estrutura do Faturamento (custos, mão obra, taxa, imposto, comissões, 60% valor líquido) usando totalRecebido como base → resultado BS

**Componentes:**
- `DreBsUnidade.tsx` — DRE faturamento (aba Faturamento)
- `DreRecebiveis.tsx` — DRE caixa completo (aba Recebíveis) — mesma estrutura visual do Faturamento

**Sidebar atualizada:**
- "Despesas" no grupo Principal
- "Categorias Despesa" e "Taxas Cartão" no grupo Configurações

### Correções de banco (Migration 018+) — 2026-03-21

- Coluna `bandeira` adicionada em `pagamentos` (faltava da migration 017)
- Coluna `bandeira` adicionada em `taxas_cartao_reais` (faltava da migration 017)
- Todos os pagamentos de cartão existentes setados como `visa_master`
- 26 taxas reais inseridas com valores corretos (antes estavam zeradas)
- Seletor de bandeira no modal de pagamento (já existia no código, agora funciona com coluna no banco)

### Correções DRE Recebíveis + Faturamento — 2026-03-21

- **DRE Recebíveis reescrito** — agora tem DRE completo (mesma estrutura do Faturamento) usando `totalRecebido` como base em vez de `faturamento_bruto`. Seção de entradas (PIX, Dinheiro, Cartão, Parcelas) + DRE BS (custos, mão de obra, taxa, imposto, comissões, 60% valor líquido, deduções)
- **Custos de procedimentos corrigidos** — `resumo_mensal.total_custos_procedimentos` estava zerado (resumo calculado antes dos procedimentos terem custo_fixo). Recalculado: Fev=R$2.560, Jan=R$570, com cascata em valor_liquido/valor_beauty_smile/valor_clinica
- **Tipo `DreRecebiveisData` expandido** — de 7 para 17 campos (espelha `DreBsUnidadeData`)

### Fix: KPI "A Receber" com parcelas futuras em tempo real — 2026-03-21

- **Problema:** KPI "A Receber" no dashboard mostrava valor estático do `resumo_mensal` (calculado no upload). No Resumo Geral, somava apenas `valor_em_aberto` dos orçamentos (inadimplência). Em meses específicos, mostrava o valor congelado no momento do cálculo — não refletia parcelas recebidas ou novas.
- **Correção:** Agora busca `parcelas_cartao` com `status = 'projetado'` em tempo real (3 funções corrigidas em `lib/dashboard-queries.ts`: `fetchKpisAdmin`, `fetchKpisAdminResumoGeral`, `fetchKpisAdminV2`)
- **Resultado:** Dashboard mostra o total real de dinheiro que ainda vai cair na conta via parcelas de cartão

### Integração Clinicorp API — Sync Diário Automático (2026-03-21)

Redesenho completo do fluxo de dados: elimina upload XLSX, tudo vem da API Clinicorp automaticamente.

**Core (`lib/clinicorp-sync.ts`):**
- Função `syncClinicaMonth()` — lógica extraída e reutilizável (cron + manual)
- Sincroniza orçamentos (fechados + abertos), pagamentos e tratamentos executados
- Tratamentos via StepsList da API (Executed="X", filtrado por mês)
- Idempotência: orçamentos/pagamentos por ID Clinicorp, tratamentos por replace (delete + re-insert)
- Recálculo automático: `calcularEPersistirResumo()` direto após sync (sem n8n roundtrip)
- Usa `createSupabaseAdminClient()` (cron sem sessão de usuário)

**Vercel Cron (`app/api/cron/clinicorp-sync/route.ts`):**
- Roda diariamente 6:00 UTC (3:00 BRT) via `vercel.json`
- Loop: todas as clínicas com credenciais → mês atual + mês anterior
- Pula meses fechados automaticamente
- `maxDuration = 300` (Vercel Pro)

**Migration 020:**
- Tabela `sync_logs` (status, counters, error_message, trigger)
- Coluna `origem` em `tratamentos_executados` ('manual' | 'clinicorp')

**UI:**
- `/admin/upload` → página "Sincronização" com `SyncStatusPanel` (status por clínica + histórico)
- Botão "Sincronizar agora" para trigger manual
- Sidebar: "Upload" renomeado para "Sincronização"
- Inadimplência: removido `RegistrarPagamentoModal` (pagamentos automáticos via Clinicorp)
- Mantido `EstornarPagamentoModal` para correções

**Arquivos criados:**
- `lib/clinicorp-sync.ts`, `app/api/cron/clinicorp-sync/route.ts`, `vercel.json`
- `components/upload/SyncStatusPanel.tsx`
- `supabase/migrations/020_sync_logs_e_origem_tratamentos.sql`

**Arquivos modificados:**
- `app/api/admin/clinicorp/sync/route.ts` (wrapper fino → `syncClinicaMonth()`)
- `lib/clinicorp-transforms.ts` (+`transformTratamentosExecutados()`)
- `types/clinicorp.types.ts` (+tratamentos nos types)
- `app/admin/upload/page.tsx` (redesenhado com SyncStatusPanel)
- `app/admin/inadimplencia/` (removido pagamento manual)
- `app/admin/layout.tsx` (sidebar label)

---

### ✅ Correções operacionais + custo manual de procedimentos (2026-06)

Sessão de debugging a partir de falhas reportadas em produção (clínica Hirata):

**Código (PRs #3–#5 mergeados):**
- Comissão dentista: tela recarrega ao calcular (`router.refresh`) + constraint passa a permitir múltiplas dentistas por clínica (migration **021** `UNIQUE(clinica_id, dentista_id, mes_referencia)`)
- Revisão de desmembramento filtra apenas clínicas ativas (não mostra mais clínica de projeção/inativa)
- **Sync não gerencia mais `tratamentos_executados`** — custo de procedimentos é 100% manual via planilha "Procedimentos Executados" (cobre procedimentos fora de orçamento)
- **Comissão dentista entra como despesa da BS** no DRE (Recebíveis + Faturamento) e na aba Despesas
- **Fix BASE_URL da API Clinicorp** (`sistema.clinicorp.com` → `api.clinicorp.com`; host antigo virou site estático em ~05/06 e quebrava o sync)
- **Fix `transformPayments`** — usa soma dos `Amount` (não `TotalPostAmount`) para não trazer valor errado quando há vários pagamentos no mesmo header

**Dados (produção):**
- Pagamentos de Carlos e Adriana lançados (estavam no Clinicorp mas não casavam por orçamento manual sem treatment_id)
- Procedimentos executados importados jan–mai (via planilha; cortesia conta custo; "+" divide em vários)
- Clínica "Exemplo (Projeção)" apagada por completo
- Orçamento do Walmir (março) adicionado
- Todos os meses fechados/recalculados (jan–mai)

### ✅ Conta Corrente do Parceiro + refinamentos de dashboard (2026-06-07) — PR #7

Substitui o repasse mensal isolado (misturava caixa com competência → negativos absurdos) por uma **conta corrente única por parceiro**.

- **Modelo**: abre com a taxa de implementação (−250k Hirata) + resultado mensal `40% × (recebido − custos)` (RPC `calcular_resultado_mensal_parceiro`) − repasses em dinheiro (só com saldo > 0, modelo franquia). Migrations **022–024**; correção retroativa da Hirata (remove 3 repasses/abatimentos falsos). Anchor validado: **−249.711,84 (mai) / −243.701,84 (jun)**.
- **UI**: tela admin "Conta Corrente" (ex-Repasses) + aba do parceiro (read-only) + saldo nos dashboards. Função pura `montarExtrato` (TDD) + `fetchContaCorrente`.
- **Auditoria (Próximo Passo 2 — feito)**: fix do débito/crédito-1x no caixa e "A Receber" atribuível ao mês (`lib/resumo-calculo.ts`); registro do pagamento do Walmir (cartão 7x). Números conferidos contra a RPC.
- **Dashboard (Próximo Passo 3 — feito)**: aba Clínicas vira visão geral (ranking acumulado + status do sync `sync_logs` no lugar do painel de upload morto + saldo por parceiro); Procedimentos sem legenda + categorias completas; Biologix recategorizado (migration 025). View do parceiro revisada (RLS isola).

---

## Próximos Passos

### 1. Cron Vercel (sync diário automático) — ✅ resolvido (2026-06-07)
- **Causa raiz:** o Cron Job **disparava** todo dia 06:00 UTC, mas a env var **`CRON_SECRET` não existia** em Production → a Vercel não enviava o header `Authorization` → a rota retornava **401 antes de logar** (por isso `sync_logs` ficava vazio). O `vercel.json` e o agendamento sempre estiveram corretos.
- **Fix:** `CRON_SECRET` criado em Production via CLI + **redeploy** (env var só é lida pela function após redeploy). Validado: sem Bearer → 401; com Bearer → 200 + sync real (mai `skipped`/fechado, jun `success`); registros gravados em `sync_logs` com `trigger='cron'`.
- **Pendente relacionado:** `NODE_ENV` está setado manualmente como env var na Vercel (Prod/Preview/Dev) — gera warning "NODE_ENV was incorrectly set to a non-standard value" e pode estar rodando produção em modo dev. Remover a env var `NODE_ENV` da Vercel (a plataforma já define `production` sozinha).

### 2. Auditoria detalhada de números e cálculos — ✅ feito (2026-06-07, PR #7)
- Auditoria do caixa/repasse concluída (ver `docs/auditoria-numeros-2026-06.md`): split 60/40 confere; bugs do débito no caixa e "A Receber" stale corrigidos em `lib/resumo-calculo.ts`; conta corrente bate o anchor da Hirata.
- ~~Pendente menor: DRE BS/Recebíveis ainda não reauditado com casos reais.~~ ✅ **feito (2026-06-07)** — ver [`docs/auditoria-dre-2026-06.md`](docs/auditoria-dre-2026-06.md). Via mês específico correta; 2 bugs do modo "Resumo Geral" corrigidos (DRE Recebíveis zerado + taxa real = 0 inflando resultado em R$3.183,06 all-time).

### 3. Arrumar dashboard e view do parceiro — ✅ feito (2026-06-07, PR #7)
- Dashboard admin revisado: aba Clínicas (ranking acumulado + status do sync + saldo por parceiro), Procedimentos sem legenda + categorias completas.
- View do parceiro validada (aba Conta Corrente read-only, RLS isola a clínica) via smoke com login real.

---

## Pendente — Outros

### Testes
- ~~Validação RLS com usuário parceiro real~~ ✅ **feito (2026-06-07)** — ver [`docs/auditoria-rls-2026-06.md`](docs/auditoria-rls-2026-06.md). Isolamento de leitura aprovado; furos de escrita em 3 RPCs SECURITY DEFINER + sync_logs corrigidos (migration 026). Pendente decisão: remapear parceiro de teste (aponta p/ clínica inexistente) + ligar leaked password protection.
- ~~Testes E2E com Playwright~~ ✅ **feito (2026-06-07)**: `playwright.config.ts` + `e2e/` (auth, autorização/RLS, smoke admin+parceiro). **31/31 verdes** (`npm run test:e2e`, contra build de produção local + Supabase prod, read-only). Credenciais em `.env.e2e` (ver `.env.example`). O E2E **pegou 1 bug de segurança** (parceiro não era barrado de `/admin` — redirect do `AdminLayout` engolido por `try/catch`) → **corrigido**.
  - 🐛 **Achado pendente (separado):** `/admin/comissoes` loga `Could not find the table 'public.pagamentos_comissao'` — `fetchComissoesMedicos` consulta tabela inexistente (página degrada, mas a feature de comissões médicas não funciona). Investigar.

### Operacional
- Notificações Telegram via WF4 (bot n8n)
- Sidebar dropdown "Sites da rede" para navegação entre Beauty Smile e Beauty Sleep

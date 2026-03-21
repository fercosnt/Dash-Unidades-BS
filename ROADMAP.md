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

**Página de despesas (`/admin/despesas`):**
- DRE Beauty Smile no topo (componente `DreBsUnidade.tsx`)
- Tabela de despesas com filtros por mês e clínica
- Cadastro manual + upload XLSX com preview
- "Copiar do mês anterior" (somente recorrentes, sem duplicar)
- Edição inline e exclusão

**Cálculos (`lib/despesas-queries.ts`):**
- `calcularTaxaRealCartao()` — pagamentos × taxas reais por bandeira/modalidade/parcelas
- `calcularDreBsUnidade()` — DRE completo: receita BS bruta → taxa real → despesas → resultado

**Sidebar atualizada:**
- "Despesas" no grupo Principal
- "Categorias Despesa" e "Taxas Cartão" no grupo Configurações

---

## Pendente — Outros

### Testes
- Validação RLS com usuário parceiro real
- Testes E2E com Playwright (`npm run test:e2e`)

### Operacional
- Notificações Telegram via WF4 (bot n8n)
- Sidebar dropdown "Sites da rede" para navegação entre Beauty Smile e Beauty Sleep

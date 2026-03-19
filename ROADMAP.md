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

## Em Andamento — V3 Melhorias Dashboard

Plano completo: `docs/plans/2026-03-10-melhorias-dashboard-v3.md`

| # | Feature | Status |
|---|---------|--------|
| 1 | Filtros: meses 2026 + seletor de unidade + auto-recálculo | ✅ `59bd0a1` |
| 2 | Excluir tratamentos na revisão de procedimentos | ✅ `3a0e706` |
| 3 | Baixa de repasse mensal | 🔲 pendente (requer `007_repasses.sql`) |
| 4 | Saldo devedor por unidade (Franquia Fee) | 🔲 pendente (requer `007_debito.sql`) |
| 5 | Comissão da dentista — tiers + baixa + DRE | 🔲 pendente (requer `009_comissoes_dentista.sql`) |
| 6 | Página de comissões médicos indicadores | 🔲 pendente (requer `008_pagamentos_comissao.sql`) |
| 7 | Aba Vendas: tratamentos vendidos | 🔲 pendente |
| 8 | Exportar PDF | 🔲 pendente |
| 9 | Gráfico evolução por tratamento | 🔲 pendente |

---

## Pendente — Outros

### Testes
- Validação RLS com usuário parceiro real
- Testes E2E com Playwright (`npm run test:e2e`)
- Validação dos cálculos financeiros vs planilha Excel manual

### Operacional
- Notificações Telegram via WF4 (bot n8n)
- Sidebar dropdown "Sites da rede" para navegação entre Beauty Smile e Beauty Sleep

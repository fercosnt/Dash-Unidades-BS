# CLAUDE.md — Beauty Smile Partners Dashboard

Contexto de negócio e regras do domínio para uso do Claude Code neste projeto.

---

## O que é o sistema

Dashboard multi-tenant para gestão financeira das clínicas parceiras da Beauty Smile. Centraliza upload de planilhas mensais do Clinicorp, cálculo automático do split financeiro 60/40, controle de pagamentos e módulo de inadimplência. Cada clínica parceira acessa somente seus próprios dados (RLS).

**Usuários:** Admin (equipe Beauty Smile, vê tudo) + Parceiro (1 login por clínica, somente leitura dos próprios dados).

**Escala inicial:** 1–3 clínicas parceiras.

---

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Supabase** (Postgres + Auth + RLS) — região sa-east-1
- **Tailwind CSS** (sem `@beautysmile/design-system` — pacote não instalado)
- **ExcelJS** para parse de XLSX no browser (xlsx/SheetJS foi substituído por segurança)
- **Recharts** para gráficos
- **Zod** para validação de inputs no backend

**Sem prefixo `src/`** — todos os arquivos ficam na raiz: `app/`, `components/`, `lib/`, `types/`.

---

## Estrutura de rotas

```
app/
├── (auth)/login          # Login (sem auth)
├── admin/                # Painel admin (Beauty Smile)
│   ├── dashboard/        # KPIs + gráficos + ranking
│   ├── clinicas/[id]/    # Drill-down por clínica (4 abas)
│   ├── upload/           # Upload XLSX + histórico + revisão de match
│   ├── inadimplencia/    # Devedores + ação rápida de pagamento
│   ├── pagamentos/       # Projeção de recebimentos futuros
│   └── configuracoes/    # Clínicas, procedimentos, médicos, financeiro
└── parceiro/             # Painel parceiro (somente leitura, scoped por RLS)
    ├── dashboard/
    ├── orcamentos/
    ├── financeiro/
    └── inadimplencia/
```

---

## Regras de negócio

### Planilhas do Clinicorp
Dois tipos de planilha importadas mensalmente por clínica:
1. **Orçamentos** — separada automaticamente em `orcamentos_fechados` (status APPROVED) e `orcamentos_abertos` (demais)
2. **Tratamentos executados** — médico pode aparecer com `+` quando há co-tratamento (split por `+`)

### Split financeiro
- **60% Beauty Smile / 40% Clínica Parceira** (percentuais configuráveis por clínica)
- Cálculo materializado em `resumo_mensal` via n8n (não em tempo real)
- Dashboard lê dados pré-calculados, não calcula na hora

### Parâmetros financeiros (tabela `configuracoes_financeiras`)
- `taxa_cartao_percentual` — taxa cobrada nas transações de cartão
- `imposto_nf_percentual` — imposto sobre nota fiscal
- `percentual_beauty_smile` — padrão 60%
- Vigência: registro com `vigencia_fim IS NULL` é o vigente; ao salvar novo, fecha o anterior com `vigencia_fim = hoje - 1`

### Pagamentos
- **4 formas:** `cartao_credito`, `cartao_debito`, `pix`, `dinheiro`
- **Cartão crédito:** máximo 12 parcelas, lógica D+30 (parcela N recebe N meses após pagamento)
- **Arredondamento:** `ROUND(valor / n, 2)` para parcelas 1..N-1; diferença de centavos vai na última
- RPC functions atômicas: `registrar_pagamento` e `estornar_pagamento`

### Comissão médica
- Calculada sobre **valor bruto** do orçamento (`valor_total`)
- Percentual configurável por médico (`percentual_comissao`)

### Multi-tenancy
- **RLS no Supabase** isola dados por `clinica_id` — admin vê tudo, parceiro vê só sua clínica
- Functions `auth_clinica_id()` e `is_admin()` usadas nas policies
- Não usar filtro por `clinica_id` no código do parceiro — o RLS já filtra

---

## n8n (não configurado ainda)

Quatro workflows pendentes de implementação:
- **WF1** — Validação e match de procedimentos (pós-upload)
- **WF2** — Cálculo do resumo mensal (split 60/40)
- **WF3** — Auto-recebimento de parcelas de cartão (cron 00:01)
- **WF4** — Notificações Telegram

Variáveis de ambiente: `N8N_WEBHOOK_URL` e `N8N_WEBHOOK_SECRET` (server-side only).

---

## Comandos

```bash
npm run dev       # Dev server porta 3000
npm run build     # Build produção
npm run lint      # ESLint + TypeScript
npm test          # Jest
npm run test:e2e  # Playwright
```

---

## Arquivos-chave

| Arquivo | O que é |
|---|---|
| `lib/resumo-calculo.ts` | Lógica do cálculo financeiro mensal |
| `lib/dashboard-queries.ts` | Queries Supabase para dashboards |
| `lib/utils/xlsx-parser.ts` | Parse de XLSX com ExcelJS |
| `lib/utils/xlsx-transforms.ts` | Transformações dos dados brutos |
| `lib/auth/require-admin.ts` | Guard de autorização admin para Server Actions |
| `lib/utils/date-helpers.ts` | Helpers centralizados de data (firstDayOfMonth, lastDayOfMonth) |
| `lib/utils/formatting.ts` | Formatação centralizada (formatCurrency, parseCurrencyBR, etc.) |
| `supabase/migrations/` | 14 migrations SQL (schema + RLS + colunas + RPCs) |
| `supabase/seed.sql` | Dados de teste (admin, parceiro, clínica, etc.) |
| `types/database.types.ts` | Types gerados do Supabase (19 tabelas, 2 views, 5 RPCs, 6 enums) |
| `eslint.config.mjs` | ESLint 9 flat config (Next.js + TypeScript + React Hooks) |
| `ROADMAP.md` | O que foi feito e o que falta |
| `decisions.md` | Log de decisões arquiteturais |
| `docs/framework-original.md` | Spec completa original do sistema |

---

## Criação de usuário parceiro

1. No Supabase: Authentication → Users → Add user (email + senha)
2. Copiar UUID do usuário criado
3. Executar SQL em `supabase/parceiro_cobaia_via_dashboard.md` substituindo o UUID

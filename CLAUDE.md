# CLAUDE.md — Beauty Smile Partners Dashboard

Contexto de negócio e regras do domínio para uso do Claude Code neste projeto.

---

## O que é o sistema

Dashboard multi-tenant para gestão financeira das clínicas parceiras da Beauty Smile. Dados sincronizados automaticamente da API Clinicorp (orçamentos, pagamentos, tratamentos executados) com cálculo automático do split financeiro 60/40, controle de pagamentos e módulo de inadimplência. Cada clínica parceira acessa somente seus próprios dados (RLS).

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
│   ├── upload/           # Sincronização Clinicorp (status + histórico de sync)
│   ├── despesas/         # 3 abas: Recebíveis (caixa) + Faturamento (DRE BS) + Despesas
│   ├── inadimplencia/    # Devedores (pagamentos automáticos via Clinicorp)
│   ├── pagamentos/       # Projeção de recebimentos futuros
│   └── configuracoes/    # Clínicas, procedimentos, médicos, financeiro,
│                         # categorias-despesa, taxas-cartao
└── parceiro/             # Painel parceiro (somente leitura, scoped por RLS)
    ├── dashboard/
    ├── orcamentos/
    ├── financeiro/
    └── inadimplencia/
```

---

## Regras de negócio

### Sincronização Clinicorp (automática)
Dados sincronizados automaticamente da API Clinicorp via Vercel Cron (diário, 3:00 BRT):
1. **Orçamentos** — `GET /estimates/list`, separados em `orcamentos_fechados` (APPROVED) e `orcamentos_abertos` (demais)
2. **Pagamentos** — `GET /payment/list`, registrados via RPC `registrar_pagamento`
3. **Tratamentos executados** — extraídos dos `StepsList` dos estimates (Executed="X", filtrado por mês)
4. **Recálculo automático** — `calcularEPersistirResumo()` chamado direto após cada sync

**Idempotência:** orçamentos/pagamentos por `clinicorp_treatment_id`/`clinicorp_payment_id` (insert if not exists). Tratamentos: replace por mês (delete `origem='clinicorp'` + re-insert).

**Credenciais:** por clínica (`clinicorp_subscriber_id` + `clinicorp_api_key` em `clinicas_parceiras`).

**Indicações:** marcadas manualmente no fechamento do mês (API não fornece "Como conheceu?").

**Logs:** tabela `sync_logs` registra cada execução (status, contadores, erros).

### Split financeiro
- **60% Beauty Smile / 40% Clínica Parceira** (percentuais configuráveis por clínica)
- Cálculo materializado em `resumo_mensal` (recalculado automaticamente após cada sync)
- Dashboard lê dados pré-calculados, não calcula na hora
- **Exceção — KPI "A Receber":** calculado em tempo real a partir de `parcelas_cartao` com `status = 'projetado'` (soma de todas as parcelas futuras de cartão que ainda vão cair na conta). Não depende de `resumo_mensal`.

### Parâmetros financeiros (tabela `configuracoes_financeiras`)
- `taxa_cartao_percentual` — taxa cobrada nas transações de cartão
- `imposto_nf_percentual` — imposto sobre nota fiscal
- `percentual_beauty_smile` — padrão 60%
- Vigência: registro com `vigencia_fim IS NULL` é o vigente; ao salvar novo, fecha o anterior com `vigencia_fim = hoje - 1`

### Pagamentos
- **4 formas:** `cartao_credito`, `cartao_debito`, `pix`, `dinheiro`
- **Cartão crédito:** máximo 12 parcelas, lógica D+30 (parcela N recebe N meses após pagamento)
- **Arredondamento:** `ROUND(valor / n, 2)` para parcelas 1..N-1; diferença de centavos vai na última
- **Bandeira:** coluna opcional `bandeira` (`visa_master` | `outros`). NULL = `visa_master` por padrão nos cálculos
- RPC functions atômicas: `registrar_pagamento` e `estornar_pagamento`

### Despesas operacionais e DRE Beauty Smile
- **Despesas são pós-split** — custo exclusivo da BS, não afetam o 40% do parceiro
- **Categorias dinâmicas** — tabela `categorias_despesa` gerenciada pelo admin (não enum)
- **Recorrência** — flag `recorrente` permite copiar despesas para o mês seguinte
- **Input:** manual + upload XLSX (match de categoria por nome)

### DRE Beauty Smile por unidade (aba Faturamento)
Modelo financeiro para resultado real da BS por clínica:
```
RECEITA BS (bruta):
  + Custos Procedimentos (cobrado do parceiro)
  + Custo Mão de Obra (cobrado do parceiro)
  + Taxa Cartão (cobrada do parceiro — % fixo)
  + Imposto NF (cobrado do parceiro — % fixo)
  + Comissões Médicas (cobradas)
  + 60% do Valor Líquido
= Total Receita BS bruta

  (-) Taxa real cartão (pagamentos × taxa real por modalidade/bandeira/parcelas)
= Receita pós taxas (o que entrou na conta)

  (-) Comissão Dentista
  (-) Despesas operacionais (agrupadas por categoria)
= Resultado da Unidade p/ Beauty Smile
```

### DRE Recebíveis (aba Recebíveis)
Visão caixa — mesma estrutura do Faturamento, usando `totalRecebido` no lugar de `faturamento_bruto`:
```
ENTRADAS DO MÊS:
  + PIX
  + Dinheiro
  + Cartão Débito / Crédito à Vista (1x)
  + Parcelas Cartão Recebidas (status = 'recebido')
= Total Recebido

RESULTADO BS (base caixa):
  + Custos Procedimentos (de resumo_mensal)
  + Custo Mão de Obra (de resumo_mensal)
  + Taxa Cartão cobrada (de resumo_mensal)
  + Imposto NF cobrado (de resumo_mensal)
  + Comissões Médicas (de resumo_mensal)
  + 60% do Valor Líquido = 60% × (Total Recebido - custos acima)
= Receita BS Bruta (pode ser negativa se pouco foi recebido)

  (-) Taxa real cartão
= Receita pós taxas

  (-) Comissão Dentista
  (-) Despesas operacionais (agrupadas por categoria)
= Resultado da Unidade p/ Beauty Smile (base caixa)
```
- Crédito parcelado (>1x) não entra como direto — entra via `parcelas_cartao`
- Débito e crédito 1x contam como recebimento imediato

### Taxas reais de cartão (tabela `taxas_cartao_reais`)
- **Duas categorias de bandeira:** `visa_master` e `outros` (Elo, Amex, etc.)
- Taxas por parcela exata (1x a 12x para crédito + débito)
- Vigência: mesmo padrão de `configuracoes_financeiras` (`vigencia_fim IS NULL` = vigente)
- Cálculo automático: para cada pagamento, busca taxa real pela chave `bandeira_modalidade_parcelas`

### Comissão médica
- Calculada sobre **valor bruto** do orçamento (`valor_total`)
- Percentual configurável por médico (`percentual_comissao`)

### Multi-tenancy
- **RLS no Supabase** isola dados por `clinica_id` — admin vê tudo, parceiro vê só sua clínica
- Functions `auth_clinica_id()` e `is_admin()` usadas nas policies
- Não usar filtro por `clinica_id` no código do parceiro — o RLS já filtra

---

## Sincronização Clinicorp

**Vercel Cron** — diário 6:00 UTC (3:00 BRT), rota `GET /api/cron/clinicorp-sync`.
**Manual** — botão "Sincronizar agora" em `/admin/upload` chama `POST /api/admin/clinicorp/sync`.
**Core** — `lib/clinicorp-sync.ts` → `syncClinicaMonth()` (reutilizado por cron e manual).
**Recálculo** — `calcularEPersistirResumo()` chamado direto após sync (sem n8n roundtrip).

## n8n

Workflows ativos:
- **WF3** (`nkzFTRigOvX8fANH`) — Auto-recebimento parcelas cartão: Schedule 5h
- **WF4** — Notificações Telegram (pendente)

> **Nota:** WF1/WF2 (Upload Processing) foram substituídos pelo sync Clinicorp automático. O recálculo agora é feito diretamente no sync.

Variáveis de ambiente: `N8N_WEBHOOK_URL` e `N8N_WEBHOOK_SECRET` (server-side only).
Endpoint interno n8n→app: `POST /api/resumo/calcular-interno` com header `x-service-secret`.

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
| `lib/clinicorp-sync.ts` | Core do sync Clinicorp (syncClinicaMonth) |
| `lib/clinicorp-client.ts` | HTTP client Clinicorp API (listEstimates, listPayments) |
| `lib/clinicorp-transforms.ts` | Transformações API → DB (orçamentos, pagamentos, tratamentos) |
| `lib/resumo-calculo.ts` | Lógica do cálculo financeiro mensal |
| `lib/dashboard-queries.ts` | Queries Supabase para dashboards |
| `lib/utils/xlsx-parser.ts` | Parse de XLSX com ExcelJS |
| `lib/utils/xlsx-transforms.ts` | Transformações dos dados brutos |
| `lib/auth/require-admin.ts` | Guard de autorização admin para Server Actions |
| `lib/utils/date-helpers.ts` | Helpers centralizados de data (firstDayOfMonth, lastDayOfMonth) |
| `lib/utils/formatting.ts` | Formatação centralizada (formatCurrency, parseCurrencyBR, etc.) |
| `lib/despesas-queries.ts` | Queries de despesas, taxas reais, DRE BS e DRE Recebíveis |
| `components/dashboard/DreBsUnidade.tsx` | Componente visual do DRE Beauty Smile (faturamento) |
| `components/dashboard/DreRecebiveis.tsx` | Componente visual do DRE Recebíveis (visão caixa) |
| `components/upload/SyncStatusPanel.tsx` | Painel de status de sincronização Clinicorp |
| `app/api/cron/clinicorp-sync/route.ts` | Endpoint Vercel Cron (sync diário) |
| `supabase/migrations/` | 20+ migrations SQL (schema + RLS + sync_logs + etc.) |
| `supabase/seed.sql` | Dados de teste (admin, parceiro, clínica, etc.) |
| `types/database.types.ts` | Types gerados do Supabase (25 tabelas, 2 views, 5 RPCs, 6 enums) |
| `eslint.config.mjs` | ESLint 9 flat config (Next.js + TypeScript + React Hooks) |
| `ROADMAP.md` | O que foi feito e o que falta |
| `decisions.md` | Log de decisões arquiteturais |
| `docs/framework-original.md` | Spec completa original do sistema |

---

## Criação de usuário parceiro

1. No Supabase: Authentication → Users → Add user (email + senha)
2. Copiar UUID do usuário criado
3. Executar SQL em `supabase/parceiro_cobaia_via_dashboard.md` substituindo o UUID

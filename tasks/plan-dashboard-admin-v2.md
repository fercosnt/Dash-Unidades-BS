# Plano: Dashboard Admin V2 — Abas + DRE + Repasse

Data: 2026-03-06

## Objetivo

Reformular o dashboard administrativo para oferecer visualização clara do resultado financeiro da clínica parceira, com estrutura em abas, DRE cascata (bruto → lucro), cálculo de repasse e detalhamento de vendas e procedimentos.

---

## Estrutura de 4 Abas

### Aba 1 — Resumo
- **KPIs linha 1 (Financeiro):** Faturamento Bruto | Total Recebido | A Receber | Inadimplente
- **KPIs linha 2 (Operacional):** Orçamentos Fechados (qtde + valor) | Orçamentos Abertos (qtde + valor) | Procedimentos Realizados | Custo Fixo Total
- **DRE Cascata (econômico — base faturamento bruto):**
  ```
  Faturamento Bruto            R$ X        100%
  (-) Custo de Procedimentos   -R$ Y        Y%
  (-) Taxa Maquininha          -R$ Z        Z%
  (-) Impostos NF              -R$ W        W%
  (-) Custo de Mão de Obra     -R$ V        V%
  (-) Comissões Médicas        -R$ U        U%
  ─────────────────────────────────────────────
  = Valor Líquido              R$ L         L%
      → Beauty Smile (60%)     R$ BS
      → Clínica (40%)          R$ C
  ```
- **Repasse do Mês (base caixa — sobre o que realmente entrou):**
  ```
  Total Recebido no Mês           R$ R
  (-) Taxa Maquininha (s/ recebido via cartão)  -R$ A
  (-) Impostos NF (s/ faturamento total)        -R$ B
  (-) Custo de Mão de Obra (integral)           -R$ C
  (-) Custo de Procedimentos (integral)         -R$ D
  (-) Comissões Médicas                         -R$ E
  ─────────────────────────────────────────────────────
  = Disponível para Split          R$ F
      → Valor a Repassar (40%)     R$ G  ← valor a transferir
      → Beauty Smile retém (60%)   R$ H
  ```
- **Gráficos existentes:** Faturamento vs Recebido (12 meses) | Evolução Valor Líquido (12 meses)
- **Calcular resumo:** movido para botão discreto no header (modal inline)

### Aba 2 — Vendas
- **Gráfico de evolução 3 meses:** barras agrupadas com qtde e valor de orçamentos fechados e abertos por mês
- **Card de totais:** qtde fechados, valor total, ticket médio; qtde abertos, valor total
- **Tabela orçamentos fechados:** paciente, clínica, valor, status, data fechamento
- **Tabela orçamentos abertos:** paciente, clínica, valor, data criação

### Aba 3 — Procedimentos
- **Gráfico de pizza:** fatia por tipo de procedimento (% do total de procedimentos realizados)
- **Tabela ranking:** nome do procedimento, quantidade, custo unitário, custo total, % do total

### Aba 4 — Clínicas
- **Ranking de clínicas** com mini DRE (faturamento, v. líquido, parte BS, parte clínica)
- **Status de uploads** por clínica e mês

---

## Regras de Negócio Confirmadas

| Item | Regra |
|------|-------|
| Impostos NF | Calculado sobre faturamento bruto total |
| Taxa Maquininha (DRE) | Calculado sobre faturamento bruto total |
| Taxa Maquininha (Repasse) | Calculado sobre o que foi recebido via cartão no mês |
| Custo de Procedimentos | Valor integral do mês (independente de % recebido) |
| Custo de Mão de Obra | Valor fixo integral do mês |
| Comissões Médicas | % sobre valor do orçamento com indicação |
| Split | Percentual definido em configuracoes_financeiras (padrão: 60% BS, 40% clínica) |

---

## Arquivos a Criar / Modificar

### Novos tipos — `types/dashboard.types.ts`
- `KpisAdminV2` — KPIs expandidos com campos DRE e contagens operacionais
- `DreAdminData` — dados para a cascata DRE
- `RepasseAdminData` — dados para o card de repasse
- `OrcamentoFechadoItem` — item da tabela de orçamentos fechados
- `OrcamentoAbertoItem` — item da tabela de orçamentos abertos
- `ProcedimentoRankingItem` — item do ranking de procedimentos
- `ChartVendasPoint` — ponto do gráfico de evolução de vendas

### Novas queries — `lib/dashboard-queries.ts`
- `fetchKpisAdminV2(mes)` — KPIs completos: soma de resumo_mensal + contagens de orcamentos/tratamentos
- `fetchRepasseAdmin(mes)` — cálculo do repasse com taxa sobre recebido via cartão
- `fetchOrcamentosFechados(mes)` — lista para tabela (join clinicas_parceiras)
- `fetchOrcamentosAbertos(mes)` — lista para tabela (join clinicas_parceiras)
- `fetchVendasEvolucao(mes, 3)` — últimos 3 meses de vendas para gráfico
- `fetchProcedimentosRanking(mes)` — agrupamento de tratamentos_executados por procedimento

### Novos componentes
- `components/dashboard/DreCascata.tsx` — cascata DRE com percentuais
- `components/dashboard/RepasseMes.tsx` — card de repasse base caixa
- `components/dashboard/ChartVendasEvolucao.tsx` — gráfico de barras (3 meses)
- `components/dashboard/ChartProcedimentosPizza.tsx` — gráfico de pizza

### Modificações
- `components/dashboard/KpiCard.tsx` — adicionar prop `subtitle` opcional (ex: "15 fechados")
- `app/admin/dashboard/DashboardClient.tsx` — refatorar com 4 abas + novos dados
- `app/admin/dashboard/page.tsx` — adicionar novos fetches paralelos

---

## Detalhes das Queries

### `fetchKpisAdminV2(mes)`
```
1. SELECT resumo_mensal (todos os campos numéricos) WHERE mes
2. SELECT COUNT(*), SUM(valor_total) FROM orcamentos_fechados WHERE mes
3. SELECT COUNT(*), SUM(valor_total) FROM orcamentos_abertos WHERE mes
4. SELECT COUNT(*) FROM tratamentos_executados WHERE mes
→ Todos em Promise.all
```

### `fetchRepasseAdmin(mes)`
```
1. SELECT SUM(*) FROM resumo_mensal WHERE mes (pega totals)
2. SELECT SUM(valor_parcela) FROM parcelas_cartao WHERE status='recebido' AND mes_recebimento=mes
3. SELECT taxa_cartao_percentual, percentual_beauty_smile FROM configuracoes_financeiras (vigente)
→ taxa_sobre_recebido = parcelas_recebidas * taxa_pct
→ disponivel = total_recebido - taxa_sobre_recebido - total_imposto_nf - total_custo_mao_obra - total_custos_procedimentos - total_comissoes_medicas
→ repasse_clinica = disponivel * (1 - percentual_bs)
```

### `fetchOrcamentosFechados(mes)`
```
SELECT id, paciente_nome, valor_total, valor_pago, valor_em_aberto, status, data_fechamento,
       clinicas_parceiras(nome)
FROM orcamentos_fechados WHERE mes
ORDER BY valor_total DESC LIMIT 200
```

### `fetchOrcamentosAbertos(mes)`
```
SELECT id, paciente_nome, valor_total, data_criacao, clinicas_parceiras(nome)
FROM orcamentos_abertos WHERE mes
ORDER BY valor_total DESC LIMIT 200
```

### `fetchVendasEvolucao(mes, 3)`
```
Para cada um dos 3 últimos meses:
  - COUNT + SUM(valor_total) FROM orcamentos_fechados WHERE mes
  - COUNT + SUM(valor_total) FROM orcamentos_abertos WHERE mes
→ Retorna array de ChartVendasPoint
```

### `fetchProcedimentosRanking(mes)`
```
SELECT procedimento_nome, quantidade, procedimento_id, procedimentos(custo_fixo)
FROM tratamentos_executados WHERE mes
→ Agrupa por procedimento_nome em JS
→ Calcula percentual sobre total de qty
```

---

## Layout do DashboardClient Refatorado

```
<header>
  [Aba Resumo] [Aba Vendas] [Aba Procedimentos] [Aba Clínicas]   |   <PeriodoSelector>  [⚙ Calcular resumo]
</header>

{activeTab === "resumo"} →
  <div class="grid grid-cols-4 gap-4">   ← 4 KPIs financeiros
  <div class="grid grid-cols-4 gap-4">   ← 4 KPIs operacionais
  <div class="grid grid-cols-2 gap-6">   ← DRE Cascata | Repasse do Mês
  <div class="grid grid-cols-2 gap-6">   ← ChartFaturamento | ChartLiquido

{activeTab === "vendas"} →
  <ChartVendasEvolucao data={evolucao} />
  <div class="grid grid-cols-2 gap-4">  ← totais fechados | totais abertos
  <TabelaOrcamentosFechados />
  <TabelaOrcamentosAbertos />

{activeTab === "procedimentos"} →
  <div class="grid grid-cols-2 gap-6">  ← pizza chart | tabela ranking

{activeTab === "clinicas"} →
  <RankingClinicas />
  <StatusUploads />
```

---

## Ordem de Implementação

1. `types/dashboard.types.ts` — adicionar novos tipos
2. `lib/dashboard-queries.ts` — adicionar novas funções
3. `components/dashboard/KpiCard.tsx` — prop subtitle
4. `components/dashboard/DreCascata.tsx` — componente novo
5. `components/dashboard/RepasseMes.tsx` — componente novo
6. `components/dashboard/ChartVendasEvolucao.tsx` — componente novo
7. `components/dashboard/ChartProcedimentosPizza.tsx` — componente novo
8. `app/admin/dashboard/DashboardClient.tsx` — refatorar
9. `app/admin/dashboard/page.tsx` — atualizar fetches

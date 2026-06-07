# Auditoria de Números e Cálculos — 2026-06-06

Auditoria dos cálculos financeiros contra os dados reais de produção (clínica
**Dr. Maurício Hirata**, `d543b244-cdd7-4f39-b569-12a6639da019`, única clínica ativa).
Projeto Supabase: `Dash-Unidades-BS` (`fywopbgtqueoplqdegrw`). Meses: jan–mai/2026.

Config vigente: taxa cartão **2,80%**, imposto NF **12,00%**, Beauty Smile **60%**
(vigência única desde 05/03/2026).

---

## ✅ O que está CORRETO (o split 60/40 — o dinheiro que importa)

Recalculei o `resumo_mensal` a partir dos dados brutos e bate 100%:

| Mês | Faturamento | Custos Proc. | Taxa 2,8% | Imposto 12% | Líquido | BS 60% | Clínica 40% |
|-----|------------:|-------------:|----------:|------------:|--------:|-------:|------------:|
| Jan | 14.450 | 570 | 404,60 | 1.734 | 5.741,40 | 3.444,84 | 2.296,56 |
| Fev | 56.500 | 2.260 | 1.582 | 6.780 | 39.878 | 23.926,80 | 15.951,20 |
| Mar | 28.450 | 2.940 | 796,60 | 3.414 | 15.299,40 | 9.179,64 | 6.119,76 |
| Abr | 10.800 | 2.790 | 302,40 | 1.296 | 411,60 | 246,96 | 164,64 |
| Mai | 58.750 | 4.460 | 1.645 | 7.050 | 39.595 | 23.757 | 15.838 |

- **Faturamento bruto** = soma de `orcamentos_fechados.valor_total` → bate exato.
- **Custos procedimentos** = `tratamentos_executados × procedimentos.custo_fixo` → bate exato.
- **Taxa cartão (2,8%) e Imposto NF (12%)** sobre faturamento → corretos.
- **Líquido → BS (60%) → Clínica (40%)** → aritmética correta, arredondamento ok.
- **Inadimplência** (fev 7.000, mar 14.000) = `orcamentos` em_aberto/parcial → bate.
- **Parcelas de cartão**: soma das parcelas = soma dos pagamentos de crédito
  (R$112.750) exato. **D+30** correto (pago 09/02 → parcela 1 em 01/03, 2 em 01/04…).
  Divisão das parcelas correta.
- **Comissões médicas** = 0 (nenhum orçamento tem médico indicador — ver nota 6).

**Conclusão:** o cálculo do repasse por competência (60/40) está confiável.

---

## 🔴 BUG 1 — Cartão débito desaparece do caixa (afeta repasse real ao parceiro) — ✅ CORRIGIDO 2026-06-06

`resumo_mensal.total_recebido_mes` **exclui cartão débito**: o débito é excluído dos
"recebimentos diretos" (`formasCartao = [cartao_credito, cartao_debito]` em
`lib/resumo-calculo.ts:147`) **e** não gera `parcelas_cartao` (só crédito gera).
Resultado: o valor do débito não entra em lugar nenhum do `total_recebido_mes`.

**Caso real (Maio):** R$12.750 recebidos via débito → ausentes do `total_recebido_mes`
(que mostra só 11.050 das parcelas).

**Impacto — `total_recebido_mes` alimenta:**
- Dashboard admin ("Total Recebido", `lib/dashboard-queries.ts`)
- View do parceiro (`app/parceiro/financeiro/actions.ts`)
- **Repasse ao parceiro** (`lib/repasse-queries.ts:76`) → o "disponível" e o
  `valorRepassar` (40% do disponível) ficam subestimados.
  Maio: ~R$5.100 a menos de repasse (40% × 12.750).

**Inconsistência cruzada:** o **DRE Recebíveis** (`lib/despesas-queries.ts:326`)
INCLUI o débito (`recebidoDebitoAvista`). Então DRE Recebíveis e Dashboard/Repasse
**divergem** para o mesmo mês.

**Fix aplicado (2026-06-06):** em `lib/resumo-calculo.ts`, o `totalRecebidoDireto` passou
a contar tudo exceto crédito com `parcelas > 1` (espelha o DRE Recebíveis, que já estava
correto). Confirmado via RPC `registrar_pagamento` (migration 005): parcelas só são
geradas para `cartao_credito` com `parcelas > 1`, logo débito e crédito 1x não causam
dupla contagem. `resumo_mensal` de maio corrigido em produção: 11.050 → **23.800**.
Jan–abr inalterados (não tinham débito). **Pendente:** ao ligar o cron, o recálculo
automático já produz o valor correto.

---

## 🟡 ISSUE 2 — Repasse "base caixa" mistura caixa com competência

`fetchRepassesAPagar` calcula `disponível = recebido_no_mês − custos_do_mês_inteiro`
(taxa+imposto sobre faturamento TOTAL, mão de obra, custos proc., comissões).
Mistura caixa (receita) com competência (custos).

**Efeito:** em meses muito parcelados o disponível fica **negativo** mesmo com a
unidade lucrativa. Maio: 11.050 − (1.645+7.050+6.000+4.460) = **−8.105**
(seria 4.645 com o débito do Bug 1). Compensa ao longo do tempo conforme as parcelas
caem, mas mês a mês o valor de repasse fica distorcido.

**Decisão necessária:** o repasse deve ser por **caixa puro** (receita E custos
proporcionais ao recebido) ou por **competência** (o 60/40 do `valor_clinica`)? Hoje é
um híbrido.

---

## 🟡 ISSUE 3 — "A Receber" era snapshot global, não mensal — ✅ CORRIGIDO 2026-06-06

`total_recebimentos_futuros` somava **TODAS** as parcelas projetadas da clínica (sem
filtro de mês) e gravava o mesmo número em cada mês (fev/mar/abr/mai = 64.180 idêntico);
jan estava **stale** (73.485). O **admin** ignora esse campo (recalcula real-time), mas a
**view do parceiro** (`app/parceiro/financeiro/actions.ts` → histórico 12 meses) lê o
materializado direto → parceiro via o número global repetido + jan inflado.

**Fix (2026-06-06):** `lib/resumo-calculo.ts` — `total_recebimentos_futuros` agora é
**atribuível ao mês**: só as parcelas projetadas geradas pelos pagamentos (vendas)
daquele mês (join `parcelas_cartao → pagamentos` por `data_pagamento`). A soma dos meses
= total em aberto (64.180), sem duplicar. Produção recalculada:

| Mês | Antes | Depois (inad + futuras do mês) |
|-----|------:|-------------------------------:|
| Jan | 73.485 | 0 |
| Fev | 71.180 | 16.900 |
| Mar | 78.180 | 24.115 |
| Abr | 64.180 | 8.640 |
| Mai | 64.180 | 35.525 |

Admin dashboard inalterado (continua real-time). **Pendente:** ao ligar o cron, o
recálculo automático já produz o valor atribuível.

---

## 🟢 ISSUE 4 — Custos de procedimentos — ✅ NÃO é problema (revisado 2026-06-06)

Revisão: os 46 tratamentos "sem custo" são **todos do mesmo procedimento "Consulta"**
(`custo_fixo = 0`, único item zerado em todo o catálogo). **Zero** tratamentos ficaram
com `procedimento_id` nulo (todos casaram com o catálogo). Todos os demais procedimentos
têm custo cadastrado. Decisão do usuário (2026-06-06): **Consulta mantém R$0** — o tempo
do dentista já está coberto pela mão de obra de R$6.000/mês. Nenhum recálculo necessário.
O split de custos está correto.

---

## 🟡 ISSUE 5 — Orçamentos sem `clinicorp_treatment_id` (quebra o sync futuro)

Jan: 1 orçamento, Fev: 5 orçamentos sem `clinicorp_treatment_id` (digitados à mão).
Não afeta os números atuais (pagamentos foram lançados manualmente), mas quando o
**cron automático ligar**, os pagamentos da API não vão casar por treatment_id e serão
descartados ("Pagamento sem orçamento"). Já conhecido (issue #5). Resolver antes de
ligar o sync.

---

## 🟢 NOTAS

6. **Comissões médicas sempre 0** — nenhum orçamento tem `medico_indicador_id`.
   Confirmar se é esperado (Hirata sem médico indicador) ou se falta marcar.
7. ~~Latente — crédito 1x pode duplicar no DRE Recebíveis~~ **NÃO é bug.** A RPC
   `registrar_pagamento` só gera parcela para `cartao_credito` com `parcelas > 1`;
   crédito 1x não cria parcela, então não há dupla contagem. O DRE Recebíveis está
   correto e foi usado como referência para o fix do Bug 1.
8. **Despesas operacionais**: só 1 lançamento (fev, R$6.500). **Comissão dentista**
   lançada fev 1.130 / mar 289 / abr 216 / mai 1.175 (entra como despesa da BS no DRE).

---

## Prioridade de correção

1. **Bug 1 (débito no caixa)** — corrigir `resumo-calculo.ts` + recalcular jan–mai.
   É dinheiro real de repasse ao parceiro.
2. **Issue 4 (custos faltantes)** — cadastrar custos + recalcular. Afeta o split.
3. **Issue 3 (jan stale)** — recalcular jan.
4. **Issue 2 (caixa vs competência)** — decisão de negócio sobre o repasse.
5. **Issue 5** — antes de ligar o cron.

# Auditoria dos DREs (Faturamento + Recebíveis) — 2026-06-07

Reauditoria das funções `calcularDreBsUnidade` (DRE Faturamento, competência) e
`calcularDreRecebiveis` (DRE Recebíveis, caixa) em [`lib/despesas-queries.ts`](../lib/despesas-queries.ts),
contra os dados reais de produção (clínica **Dr. Maurício Hirata**,
`d543b244-cdd7-4f39-b569-12a6639da019`, única ativa). Projeto Supabase
`fywopbgtqueoplqdegrw`. Meses verificados: **maio** (débito + parcelas + comissão
dentista) e **fevereiro** (PIX + despesa operacional) de 2026.

Complementa [`auditoria-numeros-2026-06.md`](auditoria-numeros-2026-06.md), que validou o
`resumo_mensal` (split 60/40) mas **não** havia reauditado os DREs.

Config vigente: taxa cartão **2,80%**, imposto NF **12,00%**, Beauty Smile **60%**.

---

## ✅ O que está CORRETO (DRE de mês específico)

Recalculei linha a linha e bate 100%:

### Maio/2026 — DRE Recebíveis (caixa)
| Linha | Valor | Origem |
|---|---:|---|
| PIX / Dinheiro | 0 / 0 | nenhum no mês |
| Débito à vista | 12.750,00 | `pagamentos` débito |
| Parcelas cartão recebidas | 13.050,00 | `parcelas_cartao` status=recebido (7) |
| **Total Recebido** | **25.800,00** | = `resumo_mensal.total_recebido_mes` ✓ |
| (−) Custos/Taxa/Imposto/Mão obra/Comed | 4.460 / 1.645 / 7.050 / 6.000 / 0 | `resumo_mensal` |
| 60% do Líquido recebido | 3.987,00 | 0,6 × (25.800 − 19.155) |
| Receita BS Bruta | 23.142,00 | |
| (−) Taxa real cartão | 1.175,28 | ver tabela abaixo |
| (−) Despesas (Comissão Dentista) | 1.175,00 | `comissoes_dentista` |
| **Resultado Unidade** | **20.791,72** | |

### Taxa real de cartão (maio) — lookup `bandeira_modalidade_parcelas` ✓
| Pagamento | Taxa | Valor |
|---|---:|---:|
| débito 12.750 (visa_master) | 0,69% | 87,98 |
| crédito 2x 10.000 | 2,19% | 219,00 |
| crédito 4x 12.500 | 2,19% | 273,75 |
| crédito 10x 11.000 | 2,53% | 278,30 |
| crédito 10x 12.500 | 2,53% | 316,25 |
| **Total** | | **1.175,28** |

### Fevereiro/2026 — exercita PIX + despesa operacional agrupada
- Total Recebido caixa = **22.450** (só PIX) = `resumo_mensal.total_recebido_mes` ✓
- Despesas: **Salário Dentista 6.500** + **Comissão Dentista 1.130** = 7.630 ✓
- Taxa real = **1.014,75** (um pagamento é bandeira `outros`, taxa maior — o código
  usa a bandeira real corretamente).

**Conclusões da via "mês específico":**
- Lookup da taxa real correto (bandeira default `visa_master`, chave do débito
  `${bandeira}_debito_null`, crédito por nº de parcelas exato).
- Consistência caixa: `totalRecebido` do DRE Recebíveis = `total_recebido_mes` do
  `resumo_mensal` (não divergem mais — o Bug 1 da auditoria anterior está sanado).
- Agrupamento de despesas por categoria + injeção da "Comissão Dentista" como linha
  de despesa: correto. **Sem dupla contagem** (não existe categoria "Comissão
  Dentista" em `despesas_operacionais`; a linha é sintética).

---

## 🔴 BUG 1 — DRE Recebíveis zerado no "Resumo Geral" — ✅ CORRIGIDO

`calcularDreRecebiveis` tinha `if (mesReferencia === "all") return empty;`. Como o
`PeriodoSelector` oferece **"Resumo Geral"** (`value="all"`) e a página de Despesas
renderiza os dois DREs, ao selecionar "Resumo Geral" o **DRE Recebíveis aparecia
inteiro com R$ 0,00** — parecendo quebrado, enquanto o DRE BS ao lado mostrava o
acumulado.

**Fix:** removido o early-return; `"all"` agora significa "sem filtro de data" (cada
query roda sem `.gte/.lte` de mês), espelhando o que o `calcularDreBsUnidade` já fazia
com o `resumo_mensal`.

**Resultado esperado (all-time, jan–mai):** Total Recebido **68.745,00** →
Resultado Unidade **55.963,78**. (O líquido recebido all-time é baixo — 720,40 — porque
boa parte das vendas a crédito ainda está em parcelas a receber; é o comportamento
esperado da visão caixa, não erro.)

---

## 🔴 BUG 2 — Taxa real de cartão = 0 no "Resumo Geral" — ✅ CORRIGIDO

`calcularTaxaRealCartao` tinha `if (mesReferencia === "all") return 0;`. No "Resumo
Geral", a linha **"(−) Taxa real cartão" virava 0** em ambos os DREs, **inflando o
Resultado da Unidade** do DRE BS (que calcula todo o resto all-time corretamente).

**Impacto medido (all-time jan–mai):** taxa real omitida = **R$ 3.183,06**
(fev 1.014,75 + mar 719,79 + abr 273,24 + mai 1.175,28). Resultado do DRE BS no
"Resumo Geral" corrige de **119.269,84 → 116.086,78**.

**Fix:** removido o early-return; `"all"` agora soma a taxa real de todos os pagamentos
de cartão (sem filtro de data).

---

## 🟡 Observações (não-bug)

- **Latente:** se um admin cadastrar uma despesa na categoria "Comissão Dentista",
  ela coexistirá com a linha sintética injetada pelo código (duas linhas com o mesmo
  nome). Hoje não ocorre. Mitigação futura: usar a categoria real OU bloquear esse nome.
- **Por design (confirmar):** o dentista aparece em 3 lugares — Mão de Obra (R$6.000/mês,
  receita cobrada do parceiro), Salário Dentista (despesa real da BS) e Comissão Dentista
  (despesa). Coerente com o CLAUDE.md; confirmar que é proposital.
- **Comissões médicas = 0** em todos os meses (nenhum orçamento tem `medico_indicador_id`).
  Já conhecido.
- A taxa real usada no DRE BS (competência) é base **caixa** (pagamentos do mês) por
  definição do CLAUDE.md — não é inconsistência.

---

## Arquivos alterados
- [`lib/despesas-queries.ts`](../lib/despesas-queries.ts) — `calcularTaxaRealCartao` e
  `calcularDreRecebiveis` passam a tratar `"all"` como "todos os meses".

# Cálculo de Lucro e Projeções de Faturamento — Beauty Smile × Clínica Parceira

> Documento gerado em 2026-05-07 para a Clínica Dr. Maurício Hirata.
> Fonte de dados: tabelas `clinicas_parceiras`, `configuracoes_financeiras`,
> `procedimentos`, `resumo_mensal` e arquivo [lib/resumo-calculo.ts](../lib/resumo-calculo.ts).

---

## 1. Como o lucro de cada parte é calculado

O modelo Beauty Smile **não divide o faturamento bruto**. O que entra na divisão é o
**Valor Líquido**, isto é, o faturamento bruto **depois de descontados todos os
custos diretos da operação clínica**. Sobre esse Valor Líquido aplica-se o
percentual contratual (hoje **60% BS / 40% Clínica**, configurável em
`configuracoes_financeiras`).

Toda a fórmula está implementada em [lib/resumo-calculo.ts](../lib/resumo-calculo.ts)
e o resultado é materializado em `resumo_mensal` a cada sync Clinicorp.

### 1.1 Fórmula passo a passo

```
(1)  Faturamento Bruto       = Σ valor_total dos orçamentos APROVADOS no mês
(2)  Custos Procedimentos    = Σ (custo_fixo × quantidade) dos tratamentos executados
(3)  Custo Mão de Obra       = clinicas_parceiras.custo_mao_de_obra (fixo mensal)
(4)  Taxa Cartão             = Faturamento Bruto × taxa_cartao_percentual
(5)  Imposto NF              = Faturamento Bruto × imposto_nf_percentual
(6)  Comissões Médicas       = Σ (valor_total × % comissão do médico indicador)

(7)  VALOR LÍQUIDO           = (1) − (2) − (3) − (4) − (5) − (6)

(8)  Valor Beauty Smile      = (7) × percentual_beauty_smile           [60%]
(9)  Valor Clínica Parceira  = (7) − (8)                                [40%]
```

### 1.2 Detalhes que importam

- **(1) Faturamento Bruto:** soma dos `valor_total` dos `orcamentos_fechados`
  cujo `status = APPROVED` no Clinicorp, agrupados por `mes_referencia`.
- **(2) Custos de Procedimentos:** o `custo_fixo` cadastrado em `procedimentos`
  é o custo **direto** que a BS reconhece para realizar aquele procedimento
  (insumos, materiais). Multiplica pela `quantidade` do `StepsList` executado.
- **(4) e (5) — Taxa Cartão e Imposto NF na linha do líquido:** aqui são
  percentuais **fixos contratuais cobrados do parceiro** (2,80% e 12,00%
  atuais), aplicados sobre o **bruto**. Não confundir com a **taxa real** de
  cartão (que usa `taxas_cartao_reais` por bandeira/parcela) — essa é o
  **custo real** que a BS paga à adquirente e aparece só no DRE BS pós-split,
  não na divisão com a clínica.
- **(6) Comissões Médicas:** aplicadas sobre o **valor bruto** do orçamento
  (NÃO sobre o líquido). Hoje na clínica Hirata estão zeradas (não há médico
  indicador ativo).
- **Lucro do Parceiro = (9):** ponto-final na ótica do parceiro. Despesas
  operacionais (salário Beatriz, água, luz etc.) **não** entram no cálculo do
  parceiro — são custo exclusivo BS, **pós-split**.
- **Lucro Real BS:** o valor (8) é só a **fatia BS do líquido**. O lucro de
  fato da BS por unidade considera ainda o que ela cobra do parceiro (custos
  procedimentos, MO, taxa cartão, imposto NF, comissões médicas) menos o que
  ela efetivamente paga (taxa real adquirente, comissões dentista, despesas
  operacionais). Esse é o DRE BS por unidade, em
  [components/dashboard/DreBsUnidade.tsx](../components/dashboard/DreBsUnidade.tsx).

### 1.3 Margem líquida do parceiro

A margem líquida do parceiro pode ser olhada por duas óticas:

```
Margem do parceiro / Bruto    = (9) / (1)
Margem do parceiro / Líquido  = 40% (fixo, contratual)
```

A margem sobre o bruto cresce com o volume porque o **custo MO é fixo**
(R$ 6.000) — quanto maior o faturamento, menor o peso relativo desse custo no
resultado, e mais sobra para o líquido (e portanto para a fatia de 40% do
parceiro).

---

## 2. Parâmetros vigentes (lidos da base)

| Parâmetro | Valor | Origem |
|---|---|---|
| Percentual BS | 60,00% | `configuracoes_financeiras` |
| Taxa cartão (cobrada do parceiro) | 2,80% | `configuracoes_financeiras` |
| Imposto NF (cobrado do parceiro) | 12,00% | `configuracoes_financeiras` |
| Custo MO Hirata | R$ 6.000,00 | `clinicas_parceiras` |
| % comissão médica | 0% (sem médico indicador ativo) | `medicos_indicadores` |

### 2.1 Histórico real da Hirata (de `resumo_mensal`)

| Mês | Bruto | Líquido | BS (60%) | Clínica (40%) | Margem Clínica/Bruto |
|---|---:|---:|---:|---:|---:|
| Jan/2026 | R$ 14.450,00 | R$ 5.741,40 | R$ 3.444,84 | R$ 2.296,56 | 15,9% |
| Fev/2026 | R$ 56.500,00 | R$ 39.578,00 | R$ 23.746,80 | R$ 15.831,20 | 28,0% |
| Mar/2026 | R$ 14.450,00 | R$ 6.311,40 | R$ 3.786,84 | R$ 2.524,56 | 17,5% |

---

## 3. Capacidade operacional

Premissas:
- 22 dias úteis × 8h = **176 slots de 1h/mês**
- Cada sessão ocupa 1 slot de 1h (regra do usuário)
- **Beauty Sleep:** intervalo mínimo de 21 dias entre sessões → no mesmo mês
  cabe **apenas 1 sessão por paciente** (mesmo no pacote 4/6/Anual). O
  pacote inteiro entra no faturamento bruto do mês de venda; as demais
  sessões são executadas nos meses seguintes.
- **Alinhador Fotona:** 2h no mês da venda (moldagem + instalação +
  fotobiomodulação inicial) **+ 1h/mês de manutenção por no mínimo 2 meses
  subsequentes** (acompanhamento Fotona). Em regime estacionário, isso
  equivale a alinhadores antigos consumindo capacidade no mês corrente.

### 3.1 Custo do Beauty Sleep — observação importante

O sistema atual (`tratamentos_executados`) lança custo apenas quando a sessão
é **executada**. Isso significa que, num pacote BS Apneia 4 sessões vendido em
janeiro:

- **Mês 1 (venda):** entra +R$ 15.000 no bruto, sai R$ 380 de custo (1 sessão)
- **Meses 2/3/4:** zero faturamento, mas R$ 380 de custo cada mês

Para a estimativa, contabilizo o **custo total do pacote em regime de
competência** (matching faturamento × custo) — é o jeito mais honesto de
avaliar a margem real por venda. A foto mensal do `resumo_mensal` parecerá
diferente: mês de venda mais "gordo", meses seguintes com custo "fantasma".

---

## 4. Catálogo de procedimentos (extraído de `procedimentos`)

| Procedimento | Sessões pacote | Valor tabela | Custo unit/sessão | Restrição |
|---|---:|---:|---:|---|
| Consulta | 1 | R$ 0 | R$ 0 | — |
| Limpeza a Laser (1 sessão) | 1 | R$ 3.000 | R$ 300 | — |
| Limpeza a Laser (Manutenção) | 1 | R$ 2.000 | R$ 300 | — |
| Clareamento (1 sessão) | 1 | R$ 2.500 | R$ 190 | — |
| Clareamento (4 sessões) | 4 | R$ 7.500 | R$ 190 | todas no mês |
| Clareamento (Manutenção) | 1 | R$ 2.000 | R$ 190 | — |
| Clareamento (Sessão Extra) | 1 | R$ 1.000 | R$ 190 | — |
| Sensibilidade (Manutenção) | 1 | R$ 500 | R$ 190 | — |
| Sensibilidade (Elemento) | 1 | R$ 1.000 | R$ 190 | — |
| Sensibilidade (Extra) | 1 | R$ 500 | R$ 190 | — |
| Desinfecção Periodontal | 1 | R$ 10.500 | R$ 300 | — |
| Contenção Alinhador | 1 | R$ 3.000 | R$ 1.000 | — |
| Alinhador Fotona | tratamento longo | R$ 18.000 | R$ 5.750 | 2h venda + 1h/mês × 2+ |
| Beauty Sleep — Apneia (1 sessão) | 1 | R$ 4.950 | R$ 380 | — |
| Beauty Sleep — Apneia (4 sessões) | 4 | R$ 15.000 | R$ 380 | 21d entre sessões |
| Beauty Sleep — Apneia (6 sessões) | 6 | R$ 17.000 | R$ 380 | 21d entre sessões |
| Beauty Sleep — Apneia (Anual) | 12 | R$ 35.000 | R$ 380 | 21d entre sessões |
| Beauty Sleep — Apneia (Pacote Extra) | n/d | R$ 8.800 | R$ 380 | 21d entre sessões |
| Beauty Sleep — Apneia (Sessão Extra) | 1 | R$ 2.750 | R$ 380 | — |
| Beauty Sleep — Ronco (1 sessão) | 1 | R$ 4.050 | R$ 230 | — |
| Beauty Sleep — Ronco (4 sessões) | 4 | R$ 10.800 | R$ 230 | 21d entre sessões |
| Beauty Sleep — Ronco (6 sessões) | 6 | R$ 15.000 | R$ 230 | 21d entre sessões |
| Beauty Sleep — Ronco (Anual) | 12 | R$ 30.000 | R$ 230 | 21d entre sessões |
| Beauty Sleep — Ronco (Pacote Extra) | n/d | R$ 7.200 | R$ 230 | 21d entre sessões |
| Beauty Sleep — Ronco (Sessão Extra) | 1 | R$ 2.250 | R$ 230 | — |

**Carros-chefe (mais vendidos):** Limpeza, Clareamento e Beauty Sleep
(Apneia/Ronco). Alinhador entra como produto **secundário** mas de altíssima
alavancagem unitária.

---

## 5. Cenário A — Faturamento R$ 50.000

### 5.1 Mix vendido

| Procedimento | Qtd | Valor unit | Total | Custo unit | Sessões mês | Horas |
|---|---:|---:|---:|---:|---:|---:|
| Consulta | 15 | R$ 0 | R$ 0 | — | 15 | 15h |
| Limpeza a Laser (1 sessão) | 8 | R$ 3.000 | R$ 24.000 | R$ 300 | 8 | 8h |
| Clareamento (1 sessão) | 5 | R$ 2.500 | R$ 12.500 | R$ 190 | 5 | 5h |
| Beauty Sleep Ronco (4 sessões) | 1 | R$ 10.800 | R$ 10.800 | R$ 230 | 1 (de 4) | 1h |
| Limpeza Manutenção | 1 | R$ 2.000 | R$ 2.000 | R$ 300 | 1 | 1h |
| Sensibilidade (Elemento) | 1 | R$ 1.000 | R$ 1.000 | R$ 190 | 1 | 1h |
| **Total** | | | **R$ 50.300** | | **31** | **31h** |

**Capacidade utilizada:** 31h / 176h = **17,6%** ✓ (operação em ramp-up,
muito espaço para crescer)

### 5.2 Cálculo do split

| Linha | Valor |
|---|---:|
| (1) Faturamento Bruto | R$ 50.300,00 |
| (2) Custos Procedimentos¹ | − R$ 4.760,00 |
| (3) Custo Mão de Obra | − R$ 6.000,00 |
| (4) Taxa Cartão (2,80%) | − R$ 1.408,40 |
| (5) Imposto NF (12%) | − R$ 6.036,00 |
| (6) Comissões Médicas | − R$ 0,00 |
| **(7) Valor Líquido** | **R$ 32.095,60** |
| **(8) Beauty Smile (60%)** | **R$ 19.257,36** |
| **(9) Clínica Parceira (40%)** | **R$ 12.838,24** |

¹ Detalhe (2): 8×R$300 + 5×R$190 + 4×R$230 + 1×R$300 + 1×R$190 = R$ 4.760
(BS Ronco 4 sessões com custo total do pacote em regime de competência)

### 5.3 Margens

| Margem | Valor |
|---|---:|
| Líquido / Bruto | 63,8% |
| **BS / Bruto** | **38,3%** |
| **Clínica / Bruto** | **25,5%** |
| Clínica / Líquido | 40,0% (contratual) |

---

## 6. Cenário B — Faturamento R$ 150.000

### 6.1 Mix vendido

| Procedimento | Qtd | Valor unit | Total | Custo total tratamento | Sessões mês | Horas |
|---|---:|---:|---:|---:|---:|---:|
| Consulta | 25 | R$ 0 | R$ 0 | — | 25 | 25h |
| Limpeza a Laser (1 sessão) | 12 | R$ 3.000 | R$ 36.000 | R$ 3.600 | 12 | 12h |
| Clareamento (1 sessão) | 8 | R$ 2.500 | R$ 20.000 | R$ 1.520 | 8 | 8h |
| Clareamento (4 sessões) | 1 | R$ 7.500 | R$ 7.500 | R$ 760 | 4 | 4h |
| Beauty Sleep Apneia (4 sessões) | 2 | R$ 15.000 | R$ 30.000 | R$ 3.040 | 2 (de 8) | 2h |
| Beauty Sleep Ronco (4 sessões) | 1 | R$ 10.800 | R$ 10.800 | R$ 920 | 1 (de 4) | 1h |
| Desinfecção Periodontal | 1 | R$ 10.500 | R$ 10.500 | R$ 300 | 1 | 1h |
| Alinhador Fotona | 2 | R$ 18.000 | R$ 36.000 | R$ 11.500 | — | 4h venda |
| Follow-up alinhadores anteriores² | — | — | — | — | — | 4h |
| **Total** | | | **R$ 150.800** | **R$ 21.640** | | **61h** |

² Em regime estacionário com 2 alinhadores novos/mês, há ~4 alinhadores em
acompanhamento dos 2 meses anteriores → 4×1h = 4h de manutenção.

**Capacidade utilizada:** 61h / 176h = **34,7%** ✓ (operação em ritmo
saudável, ainda com folga)

### 6.2 Cálculo do split

| Linha | Valor |
|---|---:|
| (1) Faturamento Bruto | R$ 150.800,00 |
| (2) Custos Procedimentos | − R$ 21.640,00 |
| (3) Custo Mão de Obra | − R$ 6.000,00 |
| (4) Taxa Cartão (2,80%) | − R$ 4.222,40 |
| (5) Imposto NF (12%) | − R$ 18.096,00 |
| (6) Comissões Médicas | − R$ 0,00 |
| **(7) Valor Líquido** | **R$ 100.841,60** |
| **(8) Beauty Smile (60%)** | **R$ 60.504,96** |
| **(9) Clínica Parceira (40%)** | **R$ 40.336,64** |

### 6.3 Margens

| Margem | Valor |
|---|---:|
| Líquido / Bruto | 66,9% |
| **BS / Bruto** | **40,1%** |
| **Clínica / Bruto** | **26,7%** |
| Clínica / Líquido | 40,0% (contratual) |

---

## 7. Cenário C — Faturamento R$ 250.000

### 7.1 Mix vendido

| Procedimento | Qtd | Valor unit | Total | Custo total tratamento | Sessões mês | Horas |
|---|---:|---:|---:|---:|---:|---:|
| Consulta | 35 | R$ 0 | R$ 0 | — | 35 | 35h |
| Limpeza a Laser (1 sessão) | 20 | R$ 3.000 | R$ 60.000 | R$ 6.000 | 20 | 20h |
| Clareamento (1 sessão) | 12 | R$ 2.500 | R$ 30.000 | R$ 2.280 | 12 | 12h |
| Clareamento (4 sessões) | 2 | R$ 7.500 | R$ 15.000 | R$ 1.520 | 8 | 8h |
| Beauty Sleep Apneia (4 sessões) | 3 | R$ 15.000 | R$ 45.000 | R$ 4.560 | 3 (de 12) | 3h |
| Beauty Sleep Ronco (4 sessões) | 3 | R$ 10.800 | R$ 32.400 | R$ 2.760 | 3 (de 12) | 3h |
| Beauty Sleep Apneia (Anual) | 1 | R$ 35.000 | R$ 35.000 | R$ 4.560 | 1 (de 12) | 1h |
| Desinfecção Periodontal | 1 | R$ 10.500 | R$ 10.500 | R$ 300 | 1 | 1h |
| Alinhador Fotona | 1 | R$ 18.000 | R$ 18.000 | R$ 5.750 | — | 2h venda |
| Sensibilidade (Elemento) | 2 | R$ 1.000 | R$ 2.000 | R$ 380 | 2 | 2h |
| Contenção Alinhador | 1 | R$ 3.000 | R$ 3.000 | R$ 1.000 | 1 | 1h |
| Follow-up alinhadores anteriores³ | — | — | — | — | — | 2h |
| **Total** | | | **R$ 250.900** | **R$ 29.110** | | **90h** |

³ Em regime estacionário com 1 alinhador novo/mês, há 2 alinhadores em
acompanhamento (M-1 e M-2) → 2h de manutenção.

**Capacidade utilizada:** 90h / 176h = **51,1%** ✓ (operação madura,
ainda há ~86h livres para absorver novos pacientes ou follow-ups extras)

### 7.2 Cálculo do split

| Linha | Valor |
|---|---:|
| (1) Faturamento Bruto | R$ 250.900,00 |
| (2) Custos Procedimentos | − R$ 29.110,00 |
| (3) Custo Mão de Obra | − R$ 6.000,00 |
| (4) Taxa Cartão (2,80%) | − R$ 7.025,20 |
| (5) Imposto NF (12%) | − R$ 30.108,00 |
| (6) Comissões Médicas | − R$ 0,00 |
| **(7) Valor Líquido** | **R$ 178.656,80** |
| **(8) Beauty Smile (60%)** | **R$ 107.194,08** |
| **(9) Clínica Parceira (40%)** | **R$ 71.462,72** |

### 7.3 Margens

| Margem | Valor |
|---|---:|
| Líquido / Bruto | 71,2% |
| **BS / Bruto** | **42,7%** |
| **Clínica / Bruto** | **28,5%** |
| Clínica / Líquido | 40,0% (contratual) |

---

## 8. Cenário D — Faturamento R$ 350.000

### 8.1 Mix vendido

| Procedimento | Qtd | Valor unit | Total | Custo total tratamento | Sessões mês | Horas |
|---|---:|---:|---:|---:|---:|---:|
| Consulta | 40 | R$ 0 | R$ 0 | — | 40 | 40h |
| Limpeza a Laser (1 sessão) | 26 | R$ 3.000 | R$ 78.000 | R$ 7.800 | 26 | 26h |
| Clareamento (1 sessão) | 16 | R$ 2.500 | R$ 40.000 | R$ 3.040 | 16 | 16h |
| Clareamento (4 sessões) | 3 | R$ 7.500 | R$ 22.500 | R$ 2.280 | 12 | 12h |
| Beauty Sleep Apneia (4 sessões) | 3 | R$ 15.000 | R$ 45.000 | R$ 4.560 | 3 (de 12) | 3h |
| Beauty Sleep Ronco (4 sessões) | 3 | R$ 10.800 | R$ 32.400 | R$ 2.760 | 3 (de 12) | 3h |
| Beauty Sleep Apneia (Anual) | 1 | R$ 35.000 | R$ 35.000 | R$ 4.560 | 1 (de 12) | 1h |
| Desinfecção Periodontal | 2 | R$ 10.500 | R$ 21.000 | R$ 600 | 2 | 2h |
| Alinhador Fotona | 4 | R$ 18.000 | R$ 72.000 | R$ 23.000 | — | 8h venda |
| Contenção Alinhador | 1 | R$ 3.000 | R$ 3.000 | R$ 1.000 | 1 | 1h |
| Sensibilidade (Elemento) | 1 | R$ 1.000 | R$ 1.000 | R$ 190 | 1 | 1h |
| Follow-up alinhadores anteriores⁴ | — | — | — | — | — | 8h |
| **Total** | | | **R$ 349.900** | **R$ 49.790** | | **121h** |

⁴ Em regime estacionário com 4 alinhadores novos/mês, há ~8 alinhadores em
acompanhamento dos 2 meses anteriores → 8×1h = 8h de manutenção.

**Capacidade utilizada:** 121h / 176h = **68,8%** ✓ (operação madura no
pico, ainda há ~55h livres para absorver eventuais consultas extras e
imprevistos)

### 8.2 Cálculo do split

| Linha | Valor |
|---|---:|
| (1) Faturamento Bruto | R$ 349.900,00 |
| (2) Custos Procedimentos | − R$ 49.790,00 |
| (3) Custo Mão de Obra | − R$ 6.000,00 |
| (4) Taxa Cartão (2,80%) | − R$ 9.797,20 |
| (5) Imposto NF (12%) | − R$ 41.988,00 |
| (6) Comissões Médicas | − R$ 0,00 |
| **(7) Valor Líquido** | **R$ 242.324,80** |
| **(8) Beauty Smile (60%)** | **R$ 145.394,88** |
| **(9) Clínica Parceira (40%)** | **R$ 96.929,92** |

### 8.3 Margens

| Margem | Valor |
|---|---:|
| Líquido / Bruto | 69,3% |
| **BS / Bruto** | **41,6%** |
| **Clínica / Bruto** | **27,7%** |
| Clínica / Líquido | 40,0% (contratual) |

---

## 9. Quadro comparativo

| Métrica | Cenário A | Cenário B | Cenário C | Cenário D |
|---|---:|---:|---:|---:|
| **Faturamento Bruto** | R$ 50.300 | R$ 150.800 | R$ 250.900 | R$ 349.900 |
| Custos Procedimentos | R$ 4.760 | R$ 21.640 | R$ 29.110 | R$ 49.790 |
| Custo MO + Taxas + Imposto | R$ 13.444 | R$ 28.318 | R$ 43.133 | R$ 57.785 |
| **Valor Líquido** | R$ 32.096 | R$ 100.842 | R$ 178.657 | R$ 242.325 |
| **BS (60%)** | R$ 19.257 | R$ 60.505 | R$ 107.194 | R$ 145.395 |
| **Clínica (40%)** | R$ 12.838 | R$ 40.337 | R$ 71.463 | R$ 96.930 |
| Margem Líquido/Bruto | 63,8% | 66,9% | 71,2% | 69,3% |
| Margem BS/Bruto | 38,3% | 40,1% | 42,7% | 41,6% |
| **Margem Clínica/Bruto** | **25,5%** | **26,7%** | **28,5%** | **27,7%** |
| Capacidade ocupada | 17,6% | 34,7% | 51,1% | 68,8% |
| Slots livres no mês | 145h | 115h | 86h | 55h |

---

## 10. Observações operacionais

### 10.1 Margem cresce com escala (efeito MO fixo)
O Custo MO de R$ 6.000 é o único componente fixo. Por isso:
- Em A (R$ 50k), MO consome 11,9% do bruto → margem clínica fica em 25,5%
- Em C (R$ 250k), MO consome só 2,4% do bruto → margem clínica chega a 28,5%
- Em D (R$ 350k), MO consome só 1,7% do bruto → margem clínica em 27,7%

A margem do parceiro **cresce 3 pontos percentuais** entre A e C, sem mudar
contrato — apenas pelo ganho de escala. No cenário D a margem recua
levemente (de 28,5% para 27,7%) porque o mix tem mais Alinhadores (4 unidades
× R$ 5.750 de custo = R$ 23k → 6,6% do bruto só de custo de procedimentos
de Alinhador), que carregam custo unitário alto. Trade-off saudável: mais
Alinhador = mais valor absoluto na mão do parceiro (+ R$ 25k vs cenário C),
mesmo com 0,8 p.p. a menos de margem percentual.

### 10.2 Beauty Sleep "espalha" custo nos meses seguintes
No Cenário B, o pacote Apneia 4 sessões vendido em janeiro lança 1 sessão
(R$ 380) no mês da venda; nos meses 2/3/4 vão entrar mais R$ 380 cada **sem
faturamento bruto correspondente**, derrubando localmente a margem. O usuário
precisa lembrar disso ao olhar `resumo_mensal` mês a mês — a foto mensal pode
parecer pior do que a economia real do contrato.

### 10.3 Alinhador é o produto de maior alavancagem por hora
Vale R$ 18.000, custa R$ 5.750 (margem unitária bruta de R$ 12.250) e ocupa
apenas 2h de cadeira no mês da venda + 1h/mês × 2 meses de follow-up. Mesmo
com peso menor no mix por ser secundário, ele puxa a margem para cima sempre
que aparece. Em C, **1 alinhador (7,2% do bruto) representa cerca de 8% de
todo o líquido**. Em D, com 4 alinhadores, eles representam **20,6% do bruto
mas geram ~R$ 49k de líquido contribuído** — peso desproporcional positivo.

### 10.4 Limite real de capacidade está nas Consultas
Em todos os cenários, Consultas dominam o uso de slots:
- A: 15h consultas / 31h total = 48% dos slots
- B: 25h / 61h = 41%
- C: 35h / 90h = 39%
- D: 40h / 121h = 33%

Se a taxa de conversão consulta→fechamento for ~30-40%, os volumes batem.
Se cair, é o gargalo principal antes de tudo. No cenário D, com 40 consultas
no mês, é preciso ~50-60% de conversão para sustentar os fechamentos de
alto ticket (Alinhadores + BS Anual + Apneia/Ronco pacotes).

### 10.5 Folga de capacidade até o cenário D
Mesmo o cenário de R$ 350k usa **68,8% dos slots** — ainda há ~55h livres
para imprevistos, follow-ups extras ou crescimento marginal. O teto físico
real seria por volta de **R$ 450k-500k/mês** com 1 dentista + 1 assistente,
quando a capacidade chegaria a 90%+. A partir daí, seria necessário um 2º
dentista para destravar mais crescimento.

### 10.6 BS / Clínica em valores absolutos por mês

| Cenário | BS leva | Clínica leva | Diferença |
|---|---:|---:|---:|
| A | R$ 19.257 | R$ 12.838 | R$ 6.419 |
| B | R$ 60.505 | R$ 40.337 | R$ 20.168 |
| C | R$ 107.194 | R$ 71.463 | R$ 35.731 |
| D | R$ 145.395 | R$ 96.930 | R$ 48.465 |

A diferença BS−Clínica é exatamente 20% do líquido (60% − 40%).

---

## 11. Premissas e limitações desta projeção

- **Custos de procedimento em regime de competência:** considerei o custo
  total do pacote Beauty Sleep no mês de venda. O `resumo_mensal` real seguirá
  o regime de execução e mostrará flutuação mês a mês.
- **Steady state para Alinhador:** assumi que há alinhadores antigos sendo
  acompanhados, então os slots de follow-up dos meses anteriores entram no
  cálculo de capacidade do mês corrente.
- **Sem comissão médica:** assumi 0% porque a Hirata hoje não tem médico
  indicador ativo. Caso passe a ter, descontar do bruto antes do split.
- **Mix ilustrativo:** os números refletem **um possível mix** que totaliza
  cada faixa de faturamento, priorizando carros-chefe (Limpeza, Clareamento,
  Beauty Sleep). Ajustes reais podem variar a margem em ±2 p.p. dependendo da
  proporção de Alinhadores, Desinfecção e BS Anual.
- **Taxa cartão fixa contratual (2,80%):** é o que entra na fórmula de split.
  A taxa real paga à adquirente (variável por bandeira/parcela) só impacta o
  DRE BS pós-split, não a divisão com o parceiro.

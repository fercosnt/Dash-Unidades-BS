# Conta Corrente do Parceiro — PRD

**Autor**: Fernando | **Data**: 2026-06-06 | **Status**: Draft
**Nível**: Standard
**Upstream**: Auditoria `docs/auditoria-numeros-2026-06.md` + plano técnico `docs/plans/2026-06-06-conta-corrente-parceiro.md`

> **Nota:** este PRD substitui o modelo de dois saldos do plano técnico anterior pela **conta corrente única** (decisão de 2026-06-06). O plano técnico precisará ser revisado para refletir o modelo unificado.

---

## 1. Problema & Contexto

Hoje a Beauty Smile não tem uma forma confiável de saber **quanto deve (ou tem a receber) de cada clínica parceira**. O cálculo de repasse atual (`lib/repasse-queries.ts`) trata cada mês como um número isolado e **mistura regime de caixa com competência**: desconta os custos cheios do mês (mão de obra, imposto e taxa sobre o faturamento inteiro) do **pouco** que entrou em caixa naquele mês. Como a clínica vende muito em 10x, o dinheiro chega devagar e os custos batem de uma vez — gerando **repasses negativos absurdos** (jan −3.483, mar −1.850, abr −167) que somados dão −R$1.311 quando, por competência, o parceiro ganhou R$40 mil.

Além disso, o parceiro carrega uma **taxa de implementação de R$250.000** (a Hirata) que hoje é amortizada por "abatimentos" mensais desacoplados do resultado real — e a auditoria mostrou que já foram abatidos ~R$4.490 a mais do que o resultado justificava.

**Na voz do operador (BS):** *"Eu recebo o dinheiro do paciente, pago os custos, e preciso saber exatamente quanto sobra para o parceiro — descontando o que ele ainda deve da implementação — sem ficar adivinhando mês a mês nem pagar antes de receber."*

**Evidência (auditoria 2026-06):** o split 60/40 por competência está correto, mas a camada de **caixa/repasse** está quebrada. Detalhes e números validados em `docs/auditoria-numeros-2026-06.md`.

**HMW:** Como podemos dar à BS e ao parceiro uma visão única, correta e auditável de quanto o parceiro deve/tem a receber, que respeite o caixa real (sem antecipar) e a dívida de implementação?

**Regras de negócio confirmadas (2026-06-07):**
- **A BS recebe** o dinheiro do paciente (cartão/PIX na conta da BS) e repassa ao parceiro → a BS financia o parcelamento.
- **Venda só é lançada (orçamento fechado) com pagamento de ≥30%** → toda venda fechada já tem ≥30% em caixa; calote puro (zero pago) não ocorre.
- **Calote (v1):** prejuízo compartilhado — o resultado cai e o parceiro absorve 40% / BS 60% (coerente com competência). Tratamento explícito de perda = v2.

---

## 2. Objetivos & Métricas

**Métrica primária:**
- Saldo da conta corrente de cada parceiro **bate 100% com a conferência manual** (auditoria) em todos os meses.

**Métricas secundárias:**
- Tempo para a BS responder "quanto devo ao parceiro X?" cai de "recalcular na mão" para **1 tela**.
- Parceiro consegue ver seu saldo, extrato e dívida **sem pedir à BS**.

**Guardrails (não pode quebrar):**
- **Nunca** registrar repasse em dinheiro que deixe o saldo negativo (não antecipar).
- O resultado mensal **nunca** pode ser materializado de forma stale — sempre derivado dos dados brutos atuais.
- Isolamento RLS: parceiro vê só a própria conta.

---

## 3. Escopo

### Dentro (v1)
- Conta corrente única por parceiro, abrindo com o saldo da taxa de implementação (negativo) ou 0 (à vista).
- Cálculo do resultado operacional mensal por mês-calendário (incl. meses sem venda com mão de obra fixa).
- Saldo corrido (extrato) = saldo inicial + Σ resultados − Σ repasses em dinheiro.
- Registro de repasse em dinheiro (admin), permitido só com saldo positivo.
- Tela admin "Conta Corrente" (ex-"Repasses"): saldo + extrato + registrar repasse.
- Aba "Conta Corrente" no Financeiro do parceiro (read-only, transparência total).
- Card "Saldo do parceiro" nos dashboards admin e parceiro.
- Correção retroativa dos dados da Hirata.

### Futuro (v2)
- Política automática de "quando pagar" (ex: alerta quando saldo positivo > R$X).
- Registro de perda por inadimplência definitiva (calote).
- Exportar extrato (PDF/CSV).
- Multi-clínica em escala (onboarding de abertura de conta por parceiro).

## 3b. Fora do Escopo

| Item | Por quê | Indicação futura |
|------|---------|------------------|
| Pagar dinheiro ao parceiro com saldo negativo | Decisão de negócio: modelo de franquia, parceiro só saca após amortizar a implementação | Reavaliar se entrar parceiro com outro contrato |
| Dois saldos separados (operacional × dívida) | Conta única (a dívida é a 1ª linha do extrato; UI decompõe p/ leitura) | — |
| "Abatimento" de dívida via repasse (acoplado) | Operações auto-amortizam no saldo único; pagamento de implementação em dinheiro = evento `+` separado | — |
| Juros/correção sobre a dívida de implementação | Não há cobrança de juros no acordo atual | Adicionar se o contrato previr |
| Registro contábil/fiscal (NF do repasse) | Sistema é gestão financeira interna, não fiscal | Integração contábil futura |

---

## 4. Personas & Casos de Uso

**Admin (equipe BS):** precisa saber quanto deve a cada parceiro, registrar quando paga, e acompanhar a amortização da implementação. Acessa tudo.

**Parceiro (1 login/clínica, read-only):** quer transparência — quanto já ganhou (competência), quanto entrou, qual o saldo, quanto ainda deve da implementação.

**Casos de uso:**
1. Admin abre "Conta Corrente", escolhe a clínica, vê saldo atual e extrato linha a linha.
2. Admin, com saldo positivo, registra um repasse em dinheiro (data, valor, obs).
3. Parceiro abre Financeiro → aba "Conta Corrente" e vê saldo, extrato e dívida.
4. Admin vê no dashboard o card "Saldo do parceiro" e clica para o extrato.

---

## 5. Epic Hypotheses

- **H1:** Se mostrarmos um saldo único derivado do caixa real (em vez de repasses mensais isolados), então a BS confiará no número e parará de recalcular na mão. *Tiny act:* validar o saldo da Hirata contra a RPC (−249.711,84 em maio — anchor revisado 2026-06-07 para incluir as parcelas recebido do Walmir).
- **H2:** Se o parceiro vir seu próprio extrato e dívida, então cairá o atrito de comunicação BS↔parceiro sobre "quanto vou receber".

---

## 6. Requisitos Funcionais

| ID | Requisito | Critério de aceite |
|----|-----------|--------------------|
| RF-01 | Calcular resultado operacional mensal por mês-calendário | RPC retorna, para cada mês desde a 1ª atividade até o mês atual: `recebido`, `custos`, `resultado = 40% × (recebido − custos)`. Meses sem venda têm `custos = mão de obra fixa`. Hirata: jan −3.483,44 · fev +2.331,20 · mar −1.850,24 · abr +632,64 · mai +2.658,00 · jun +6.010,00 (recebido inclui parcelas recebido do Walmir abr/mai/jun). |
| RF-02 | Saldo de abertura = taxa de implementação | A conta abre com `−valor_total` da `debito_parceiro` ativa (FIXO; não usa `valor_pago`); se não houver dívida, abre em 0. Hirata abre em −250.000. |
| RF-03 | Extrato (conta corrente única) com 4 tipos de linha | Ordem cronológica, saldo corrido após cada linha. Tipos: **abertura** (−valor_total), **resultado** (±, mensal), **pagamento_implementacao** (+, parceiro→BS, lê `abatimentos_debito` com `repasse_id` null), **repasse** (−, BS→parceiro). |
| RF-04 | Registrar repasse em dinheiro (admin) | Só permitido se `saldo_atual > 0` e `valor ≤ saldo_atual`. Cria registro em `repasses_mensais`. Saldo reduz. Bloqueia com mensagem clara se saldo ≤ 0. |
| RF-05 | Desfazer repasse (admin) | Remove o `repasses_mensais`; saldo volta. |
| RF-06 | Tela admin "Conta Corrente" (funde Repasses + pagamento de implementação) | Ex-"Repasses". Seletor de clínica + **saldo decomposto** (RF-10) + extrato + ação "registrar repasse" + ação "registrar pagamento da implementação" (RF-11). A config "Débitos parceiros" passa a só **cadastrar/definir** a taxa. |
| RF-07 | Aba "Conta Corrente" no parceiro | Em `/parceiro/financeiro`. Read-only, transparência total: saldo decomposto + extrato completo. |
| RF-08 | Saldo nos dashboards | **Admin:** lista "Saldo por parceiro" (1 linha por clínica ativa, verde/vermelho, link p/ conta corrente). **Parceiro:** card único com saldo decomposto (compacto) + link. |
| RF-09 | Correção retroativa Hirata | Migration: remove 3 repasses + 3 abatimentos (eram falsos, ligados a repasse); `debito_parceiro` valor_pago→0. Saldo passa a derivar do modelo único. |
| RF-10 | Saldo decomposto (não confundir o −250k) | Exibir 3 números: **Taxa de implementação a amortizar** (R$250k → diminui), **Resultado operacional acumulado** (Σ resultados − Σ repasses), **Saldo da conta** (soma). + **Competência acumulada** (`Σ valor_clinica`, referência) + linha-guia "recebe em dinheiro quando o saldo ficar positivo". |
| RF-11 | Registrar pagamento da implementação (admin) | Parceiro pagou a implementação em dinheiro (à vista/parcial) → evento `+` no extrato. Reusa `registrarPagamentoDebito` (grava `abatimentos_debito` com `repasse_id` null + atualiza `valor_pago` para status). Surge **dentro** da Conta Corrente. |

---

## 7. Requisitos Não-Funcionais

- **RNF-01 (Correção):** valores arredondados a 2 casas; saldo sempre = conferência manual.
- **RNF-02 (Segurança):** ações de escrita exigem `requireAdmin()`; RLS isola o parceiro (`auth_clinica_id()`).
- **RNF-03 (Robustez):** o cálculo do resultado não depende de `resumo_mensal` existir em meses sem venda (usa mão de obra fixa via fallback).
- **RNF-04 (Consistência):** ao ligar o sync/cron, o recálculo do `resumo_mensal` mantém a conta corrente correta (saldo é derivado, não materializado).
- **RNF-05 (Performance):** RPC roda em < 1s para o horizonte de meses de uma clínica.

## 7b. Testing Decisions

- **Módulo testado (unit/Jest):** `montarExtrato` (função pura) — entrada de resultados + repasses, saída de extrato com saldo corrido. Testar comportamento externo: acumulação, saídas debitando, ordem cronológica, saldo inicial.
- **"Bom teste":** valida o saldo resultante e a ordem das linhas, não a implementação interna.
- **Prior art:** `lib/utils/calculos-financeiros.test.ts` (mesmo estilo de teste de função pura financeira) — seguir esse padrão.
- **RPC e migrations:** verificadas por SQL contra os números de referência da Hirata (auditoria), já que o projeto não tem harness de integração Supabase.

---

## 8. Considerações Técnicas

### Modelo de dados (reuso do schema existente — conta única, fundida)
- `debito_parceiro` (Taxa de Implementação) = **abertura da conta** (saldo inicial = −`valor_total`, FIXO). A config "Débitos parceiros" só **define** a taxa.
- `abatimentos_debito` com `repasse_id` null = **pagamentos da implementação em dinheiro** (parceiro→BS) → lidos como eventos `+` no extrato. (`valor_pago` segue como cache p/ status "quitado".)
- `repasses_mensais` = saídas em dinheiro (BS→parceiro). Remover `UNIQUE(clinica_id, mes_referencia)` (0..N por mês). Coluna `tipo` ('dinheiro') opcional p/ extensibilidade.
- `resumo_mensal` continua fonte dos **custos** dos meses com venda (já corrigido na auditoria).
- **Extrato = 4 fontes** num livro-razão único: abertura (`debito_parceiro`) + resultados (RPC) + pagamentos de implementação (`abatimentos_debito` repasse_id null) + repasses (`repasses_mensais`).

### Deep module: cálculo da conta corrente
Encapsular toda a complexidade (caixa por mês, custos por mês, mão de obra fixa, saldo inicial, saldo corrido) atrás de **uma interface simples**: `fetchContaCorrente(clinicaId) → { saldo, extrato, dividaImplementacao, competenciaAcumulada }`. Internamente: RPC (resultado mensal) + função pura (`montarExtrato`).

### RPC `calcular_resultado_mensal_parceiro` `[do prototype — encoda a decisão de cálculo]`
```sql
-- resultado = (1 - %BS) × (recebido_caixa_do_mês − custos_do_mês), por mês-calendário
-- recebido = pagamentos não-crédito-parcelado (data_pagamento) + parcelas recebidas (mes_recebimento)
-- custos = COALESCE(custos do resumo_mensal, mão de obra fixa da clínica)
-- (SQL completo no plano técnico; meses via generate_series do 1º mês de atividade até o mês atual)
```

### Saldo (regra)
```
saldo_inicial = -(debito_parceiro.valor_total ativo)  // ou 0
saldo = saldo_inicial + Σ resultado_mensal − Σ repasse_dinheiro
repasse permitido só se saldo > 0 e valor ≤ saldo
```

### Mapa de orientação (topologia, não implementação)
- `lib/saldo-parceiro-queries.ts` — interface `fetchContaCorrente`.
- `lib/utils/extrato-parceiro.ts` (+ teste) — função pura do extrato.
- `supabase/migrations/022_*`, `023_*` — RPC + correção retroativa.
- `app/admin/repasses/*` — tela admin (renomear para Conta Corrente).
- `app/parceiro/financeiro/*` — aba do parceiro.
- dashboards admin/parceiro — card de saldo.

---

## 9. Riscos & Mitigações

| Risco | Mitigação |
|-------|-----------|
| Correção retroativa apaga dados de produção (023) | Reversível (recriável); confirmar com usuário antes de aplicar; backup do estado atual (já documentado na auditoria) |
| Saldo confunde (negativo = dívida) | Convenção clara na UI (vermelho/verde + legenda); 1ª linha do extrato nomeia "Taxa de implementação" |
| Mês sem venda esquece mão de obra | RNF-03: RPC injeta mão de obra fixa via fallback; teste do caso (jun) |
| Ligar o cron quebra números | Saldo é derivado; recálculo do resumo mantém consistência (RNF-04) |

---

## 10. Questões em Aberto

- Quando/como a BS é lembrada de pagar o parceiro quando o saldo fica positivo? (v2: alerta)
- Calote definitivo: registrar perda ou só "nunca entra"? (v2)
- A taxa de implementação tem prazo/vencimento ou é só amortização por resultado? (assumido: só amortização)
- Multi-clínica: processo de abertura de conta (definir `debito_parceiro`) por novo parceiro.

---

## 11. Resumo das decisões travadas (grill 2026-06-07)

- Conta **única** por parceiro; abre em **−valor_total** da taxa de implementação (fixo) ou 0 (sem dívida).
- Resultado mensal = 40% × (recebido − custos do mês); mão de obra fixa todo mês. Custos lidos do `resumo_mensal` (DRY).
- Negativos acumulam; **BS banca**, parceiro nunca aporta. Dinheiro ao parceiro **só com saldo positivo** (franquia).
- **Fusão:** "Débitos parceiros" só define a taxa; todos os movimentos (resultado, pagamento de implementação, repasse) ficam no **extrato único** da Conta Corrente. Pagamento de implementação = evento `+` (lê `abatimentos_debito` repasse_id null).
- **Saldo decomposto** na UI (implementação a amortizar / operacional acumulado / saldo + competência).
- Dashboard: **lista por clínica** no admin / **card único** no parceiro. Transparência total ao parceiro.
- **Calote** 40/60 (v1); **regra dos 30%** (venda só lança com ≥30% pago); **BS recebe** o dinheiro e financia o parcelamento.
- Retroativo: zera repasses/abatimentos da Hirata; saldo deriva do modelo (−249.711,84 em mai — anchor revisado 2026-06-07 p/ incluir parcelas recebido do Walmir; era −251.311,84).
- **Já executado (2026-06-07):** correção do **Walmir** em produção (R$14k cartão 7x registrado, parcelas geradas, `resumo` recalculado; inadimplência real restante = só Adriana fev R$7k).

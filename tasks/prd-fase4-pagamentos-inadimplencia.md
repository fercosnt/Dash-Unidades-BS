# PRD Fase 4: Pagamentos e Inadimplencia

## 1. Introducao/Overview

Esta PRD cobre o **modulo de registro de pagamentos, controle de parcelas de cartao, inadimplencia e projecao de recebimentos futuros** do Beauty Smile Partners Dashboard.

**Problema**: Hoje nao ha um sistema para registrar pagamentos recebidos dos pacientes, controlar parcelas de cartao, nem visibilidade de quem esta inadimplente. Tudo e feito em planilhas separadas.

**O que esta fase entrega**:
- Registro de pagamentos vinculados a orcamentos fechados (com forma de pagamento, parcelas, etc.)
- Geracao automatica de parcelas projetadas para cartao de credito
- Cron job para auto-marcar parcelas como recebidas quando o mes chega
- Tela dedicada de inadimplencia com lista de pacientes devedores
- Projecao de recebimentos futuros (fluxo de caixa por parcelas de cartao)
- Visao de inadimplencia no dashboard parceiro

**Pre-requisito**: Fases 1, 2 e 3 concluidas (fundacao, uploads, dashboards e calculo financeiro).

---

## 2. Goals

1. Admin registra pagamentos com valor, forma e parcelas, e o saldo do orcamento atualiza automaticamente
2. Pagamentos em cartao de credito geram parcelas projetadas automaticamente
3. Parcelas de cartao sao marcadas como recebidas automaticamente quando o mes de recebimento chega
4. Admin tem visao clara de todos os pacientes inadimplentes, filtrados por clinica, valor e tempo
5. Admin e parceiro tem visao de recebimentos futuros (fluxo de caixa projetado por parcelas)
6. Parceiro ve inadimplencia dos seus proprios pacientes

---

## 3. User Stories

### US-26: Registrar Pagamento
**Como** administrador,
**quero** registrar um pagamento de um paciente vinculado a um orcamento fechado,
**para** atualizar o saldo devedor e manter o controle financeiro em dia.

### US-27: Pagamento Parcelado em Cartao
**Como** administrador,
**quero** registrar um pagamento em cartao de credito parcelado,
**para** que o sistema gere automaticamente as parcelas com projecao de quando cada uma sera recebida.

### US-28: Estornar Pagamento
**Como** administrador,
**quero** estornar (deletar) um pagamento registrado por engano,
**para** corrigir erros sem precisar manipular o banco diretamente.

### US-29: Auto-recebimento de Parcelas
**Como** sistema,
**quero** marcar automaticamente as parcelas de cartao como recebidas quando o mes de recebimento chega,
**para** manter o fluxo de caixa atualizado sem intervencao manual.

### US-30: Visualizar Inadimplentes
**Como** administrador,
**quero** ver a lista de todos os pacientes com saldo em aberto,
**para** tomar acoes de cobranca e acompanhar a inadimplencia.

### US-31: Projecao de Recebimentos
**Como** administrador,
**quero** ver quanto a empresa vai receber nos proximos meses (parcelas de cartao projetadas),
**para** planejar o fluxo de caixa.

### US-32: Inadimplencia do Parceiro
**Como** parceiro,
**quero** ver a lista de pacientes da minha clinica com saldo em aberto,
**para** auxiliar na cobranca e acompanhar a situacao.

### US-33: Acao Rapida de Pagamento
**Como** administrador,
**quero** registrar um pagamento diretamente da tela de inadimplencia,
**para** agilizar o processo quando recebo um pagamento de um paciente devedor.

---

## 4. Functional Requirements

### 4.1 Registro de Pagamento (Modal)

1. **Acesso ao modal de pagamento**: disponivel em 3 lugares:
   - Drill-down da clinica > aba Orcamentos Fechados > botao "Registrar Pagamento" na linha do orcamento
   - Tela de inadimplencia > botao "Registrar Pagamento" na linha do paciente
   - Detalhe do orcamento (se implementado)

2. **Campos do modal**:
   - **Orcamento** (pre-selecionado, read-only): mostra paciente + valor total + saldo em aberto
   - **Valor do pagamento** (R$, obrigatorio): nao pode exceder o valor_em_aberto do orcamento
   - **Forma de pagamento** (dropdown, obrigatorio): Cartao Credito, Cartao Debito, PIX, Dinheiro
   - **Numero de parcelas** (obrigatorio se forma = cartao_credito): 1 a 12
   - **Data do pagamento** (date picker, obrigatorio, default = hoje)

3. **Validacoes**:
   - Valor > 0
   - Valor <= valor_em_aberto do orcamento
   - Se forma = cartao_credito: parcelas >= 1
   - Se forma != cartao_credito: parcelas = 1 (automatico, campo escondido)
   - Data nao pode ser futura (maximo = hoje)

4. **Ao confirmar pagamento**, o sistema executa atomicamente:
   a. Cria registro em `pagamentos` (valor, forma, parcelas, data, clinica_id, orcamento_fechado_id, registrado_por)
   b. Se forma = cartao_credito E parcelas > 1:
      - Gera N registros em `parcelas_cartao`:
        - `valor_parcela = valor / parcelas` (arredondar centavos na ultima parcela)
        - `parcela_numero = 1..N`
        - `total_parcelas = N`
        - `mes_recebimento = data_pagamento + parcela_numero meses` (primeiro dia do mes, D+30 -- primeira parcela recebe no mes seguinte ao pagamento)
        - `status = 'projetado'`
        - `clinica_id = orcamento.clinica_id`
   c. Atualiza `orcamentos_fechados.valor_pago`:
      - `valor_pago = valor_pago + valor_do_pagamento`
      - O trigger `update_orcamento_status` cuida de atualizar o status automaticamente (em_aberto → parcial → quitado)

5. **Feedback visual**: Apos confirmacao, mostrar mensagem de sucesso e atualizar a tabela de orcamentos

### 4.2 Estorno de Pagamento

6. Na lista de pagamentos de um orcamento, cada pagamento tem botao "Estornar"
7. Ao clicar em "Estornar":
   - Modal de confirmacao: "Tem certeza que deseja estornar o pagamento de R$ X.XXX,XX de [data]? Esta acao nao pode ser desfeita."
   - Se confirmado:
     a. Deleta registros de `parcelas_cartao` vinculados ao pagamento (CASCADE)
     b. Deleta registro de `pagamentos`
     c. Atualiza `orcamentos_fechados.valor_pago` = `valor_pago - valor_do_pagamento`
     d. Trigger atualiza status do orcamento

### 4.3 API Routes de Pagamento

8. `POST /api/pagamentos`:
   - Body: `{ orcamento_fechado_id, valor, forma, parcelas, data_pagamento }`
   - Auth: somente admin
   - Executa a logica dos requisitos 4a-4c
   - Retorna: pagamento criado + parcelas geradas (se cartao)

9. `DELETE /api/pagamentos/[id]`:
   - Auth: somente admin
   - Executa logica de estorno (requisitos 7a-7d)
   - Retorna: confirmacao

### 4.4 Auto-recebimento de Parcelas (n8n Workflow 3)

10. **Trigger**: Cron diario as 00:01 (n8n schedule)
11. **Logica**:
    - Buscar `parcelas_cartao` WHERE `mes_recebimento <= primeiro_dia_mes_atual` AND `status = 'projetado'`
    - Atualizar status → 'recebido' para todas as encontradas
    - Premissa: cartao parcelado e receita garantida pela operadora; quando o mes chega, o dinheiro e recebido automaticamente
12. **Log**:
    - Logar no console do n8n: "[N] parcelas de cartao marcadas como recebidas em [mes/ano]"
    - Notificacao Telegram sera adicionada em fase posterior (bot nao configurado)

### 4.5 Tela de Inadimplencia (`/(admin)/inadimplencia/page.tsx`)

13. **Tabela principal** (dados da view `vw_inadimplentes`):
    - Colunas: Paciente, Clinica, Valor Total, Valor Pago, Valor em Aberto, Dias em Aberto, Status
    - Ordenacao padrao: valor_em_aberto decrescente (maiores devedores primeiro)

14. **Filtros**:
    - Por clinica (dropdown)
    - Por faixa de valor (ex: > R$ 1.000, > R$ 5.000, > R$ 10.000)
    - Por tempo (ex: > 30 dias, > 60 dias, > 90 dias em aberto)
    - Por status (em_aberto, parcial)

15. **Cards KPI no topo**:
    - Total inadimplente (soma de valor_em_aberto)
    - Quantidade de pacientes inadimplentes
    - Maior valor individual em aberto
    - Inadimplencia media por paciente

16. **Acoes na linha**:
    - Botao "Registrar Pagamento" → abre modal de pagamento (req 2) com orcamento pre-selecionado
    - Botao "Ver Detalhes" → navega para orcamento completo com historico de pagamentos

17. **Detalhes do orcamento** (expandir linha ou pagina separada):
    - Informacoes do orcamento: paciente, valor total, data, profissional, procedimentos
    - Telefone do paciente (para contato de cobranca)
    - Lista de pagamentos ja realizados (data, valor, forma, parcelas)
    - Saldo remanescente

### 4.6 Projecao de Recebimentos Futuros (`/(admin)/pagamentos/page.tsx` ou secao no dashboard)

18. **Tabela de projecao** (dados da view `vw_recebimentos_futuros`):
    - Colunas: Mes, Clinica, Total Projetado, Qtd Parcelas
    - Agrupado por mes de recebimento
    - Filtro por clinica

19. **Visao de calendario/timeline**:
    - Proximos 12 meses
    - Barra visual mostrando valor projetado por mes
    - Total geral projetado

20. **Detalhamento por mes** (ao clicar em um mes):
    - Lista de parcelas individuais: Paciente, Orcamento, Parcela N/Total, Valor, Status

### 4.7 Dashboard Parceiro - Inadimplencia (`/(parceiro)/inadimplencia/page.tsx`)

21. **Tabela de inadimplentes** (somente pacientes da clinica do parceiro):
    - Colunas: Paciente, Valor Total, Valor Pago, Valor em Aberto, Dias em Aberto
    - Somente leitura (sem botao de registrar pagamento)
    - Filtro por faixa de valor e tempo

22. **Cards KPI** (somente dados da clinica):
    - Total inadimplente da clinica
    - Quantidade de pacientes inadimplentes

23. **Projecao de recebimentos** (somente da clinica):
    - Tabela simplificada: Mes, Total Projetado, Qtd Parcelas
    - Proximos 6 meses

---

## 5. Non-Goals (Out of Scope)

- **Cobranca automatica** (envio de SMS, WhatsApp ou email para pacientes) -- funcionalidade futura
- **Integracao com operadoras de cartao** -- o sistema nao consulta recebimento real, usa projecao baseada em parcelas
- **Conciliacao bancaria** -- nao compara com extrato bancario real
- **Multiplos pagamentos simultaneos** (batch) -- um pagamento por vez
- **Edicao de pagamento** -- para corrigir, estornar e registrar novamente
- **Desconto ou juros em pagamentos** -- valor registrado e o valor efetivamente pago
- **Exportacao da lista de inadimplentes** (PDF/Excel) -- funcionalidade futura
- **Notificacao automatica quando paciente atinge X dias de atraso** -- nao necessario, view no dashboard e suficiente
- **Notificacoes Telegram** -- bot nao configurado, sera adicionado em fase posterior
- **Boleto e Transferencia como formas de pagamento** -- removidos, apenas Cartao Credito, Debito, PIX e Dinheiro

---

## 6. Design Considerations

### Templates do Design System:
- **ListWithFilters** -- Tela de inadimplencia, projecao de recebimentos
- **DetailView** -- Detalhe do orcamento com historico de pagamentos

### Modal de Pagamento:
- Modal limpo com formulario simples
- Mostrar saldo em aberto bem visivel no topo
- Campos condicionais (parcelas so aparece para cartao credito)
- Botao de confirmar com loading state

### Cores e indicadores:
- Inadimplencia: usar vermelho/laranja para destaque
- Projecao: usar azul/verde para valores futuros
- Status das parcelas: verde (recebido), azul (projetado)

### UX Inadimplencia:
- Acao rapida: poder registrar pagamento direto da lista sem navegar para outra pagina
- Telefone visivel para facilitar cobranca
- Ordenacao inteligente (maiores valores primeiro)

---

## 7. Technical Considerations

### Atomicidade do Pagamento:
- Criacao do pagamento + parcelas + atualizacao do orcamento devem ser atomicos
- Usar transacao no Supabase (ou RPC function) para garantir consistencia
- Se qualquer passo falhar, todo o processo faz rollback

### Formas de Pagamento (enum atualizado):
- O enum `forma_pagamento` no schema deve conter apenas: `cartao_credito`, `cartao_debito`, `pix`, `dinheiro`
- Removidos `boleto` e `transferencia` do enum original do framework

### Arredondamento de Parcelas:
- `valor / parcelas` pode gerar centavos quebrados
- Regra: arredondar cada parcela para 2 casas decimais
- Diferenca de arredondamento vai na ultima parcela
- Exemplo: R$ 1.000 / 3 = R$ 333,33 + R$ 333,33 + R$ 333,34
- Maximo 12 parcelas

### Logica D+30 para Parcelas:
- Parcela 1: mes seguinte ao pagamento
- Parcela 2: 2 meses apos o pagamento
- Parcela N: N meses apos o pagamento
- Ex: Pagamento em 10/03/2026, 3x → Abr/2026, Mai/2026, Jun/2026

### Supabase RPC para Pagamento:
- Considerar criar uma function PostgreSQL que encapsule toda a logica de pagamento
- Beneficios: atomicidade garantida, performance, logica no banco
- Alternativa: fazer via API Route com multiplas queries (menos robusto mas mais simples)

### Cron n8n:
- Schedule: `0 0 * * *` (todo dia a meia-noite)
- Idempotente: rodar multiplas vezes no mesmo dia nao causa efeito colateral (parcelas ja recebidas nao sao afetadas)
- Timezone: configurar para America/Sao_Paulo

### Recalculo do Resumo Mensal:
- Apos registrar/estornar pagamento, o `resumo_mensal` e recalculado AUTOMATICAMENTE
- O sistema dispara o recalculo via n8n (mesmo webhook da Fase 3) apos cada operacao de pagamento/estorno
- Garante que KPIs e dashboard estejam sempre atualizados

### Views SQL:
- `vw_inadimplentes` e `vw_recebimentos_futuros` ja foram criadas na Fase 1 (schema)
- Se precisar de ajustes, alterar as views (sem impacto no frontend)

---

## 8. Success Metrics

1. **Pagamento funcional**: Admin registra pagamento e o saldo do orcamento atualiza corretamente
2. **Parcelas geradas**: Pagamento parcelado em cartao gera N parcelas com meses corretos e valores somando o total
3. **Estorno funcional**: Admin estorna pagamento e saldo volta ao valor anterior
4. **Auto-recebimento**: Parcelas com mes_recebimento <= mes atual sao marcadas como recebidas pelo cron
5. **Inadimplencia correta**: Lista mostra somente pacientes com saldo em aberto, valores batem com o banco
6. **Projecao confiavel**: Valores projetados por mes batem com a soma das parcelas no banco
7. **Isolamento parceiro**: Parceiro ve inadimplencia somente dos seus pacientes (testar RLS)
8. **Arredondamento correto**: Soma das parcelas sempre iguala o valor total do pagamento

---

## 9. Open Questions

Todas as questoes iniciais foram respondidas:

| # | Questao | Resposta |
|---|---------|----------|
| 1 | Politica de inadimplencia? | Qualquer saldo em aberto e considerado inadimplente (sem threshold de dias) |
| 2 | Recalculo automatico? | Sim, resumo mensal e recalculado automaticamente apos cada pagamento/estorno |
| 3 | Primeiro recebimento cartao? | D+30 -- primeira parcela recebe no mes seguinte ao pagamento |
| 4 | Formas de pagamento? | 4 formas: Cartao Credito, Cartao Debito, PIX, Dinheiro (removidos Boleto e Transferencia) |
| 5 | Limite de parcelas? | Maximo 12x |
| 6 | Notificacao de inadimplencia? | Nao precisa. View no dashboard e suficiente |

**Sem questoes pendentes para esta fase.**

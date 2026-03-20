# Próximas Implementações — Beauty Smile Partners Dashboard

Arquivo para registrar ideias e melhorias futuras para o projeto.

---

## 1. Fechamento Mensal de Repasses para Clínica Parceira

**Contexto:** Atualmente o sistema calcula comissões e pagamentos, mas não há uma visão consolidada do que precisa ser transferido mensalmente para cada unidade parceira.

**O que implementar:**
- Página de **fechamento mensal** por clínica parceira
- Filtrar apenas pagamentos recebidos via **PIX e Cartão** (pagamentos que efetivamente caíram)
- Exibir o valor bruto recebido no mês
- Aplicar descontos (taxas de cartão, comissão médica, etc.) e chegar ao **valor líquido a transferir**
- Botão para **dar baixa no repasse** (marcar mês como pago/transferido)
- Histórico de repasses realizados com data, valor e comprovante opcional

**Visão do parceiro:**
- Parceiro vê o status do fechamento de cada mês (pendente / transferido)
- Acesso somente leitura ao detalhamento do cálculo

**Dados necessários:**
- Agrupar `pagamentos` por mês de recebimento efetivo (`data_pagamento`)
- Considerar apenas forma de pagamento: `pix`, `cartao_credito`, `cartao_debito`
- Deduzir: taxa cartão, comissão médica, outros descontos configurados
- Nova tabela: `repasses_parceiro` (mes_referencia, clinica_id, valor_bruto, descontos, valor_liquido, data_repasse, status)

---

## 2. Controle de Repasses para a Clínica Parceira

**Contexto:** Complemento do item 1 — visão administrativa de todos os repasses realizados para todas as clínicas.

**O que implementar:**
- Tela admin com listagem de todos os repasses (todas as clínicas)
- Filtros: clínica, período, status (pendente / transferido / em atraso)
- KPIs: total a repassar no mês atual, total repassado no período, clínicas com repasse pendente
- Ação de registrar transferência (data, valor, comprovante/observação)
- Exportação em XLSX do extrato de repasses

---

## 3. Excluir Tratamentos na Revisão de Procedimentos

**Contexto:** Na aba de revisão de procedimentos (match de procedimentos do upload), às vezes existem tratamentos que não devem ser vinculados — erros de digitação, itens fora do escopo, etc.

**O que implementar:**
- Botão **Excluir** em cada linha da tabela de revisão de procedimentos
- Confirmação antes de excluir (modal ou confirmação inline)
- Tratamento excluído é removido do batch atual (sem afetar outros registros)
- Indicador de quantos itens foram excluídos no resumo do upload

---

---

## 4. Saldo Devedor por Unidade (Franquia Fee)

**Contexto:** Ao fechar parceria, a clínica assume um débito de entrada com a Beauty Smile (ex: R$250.000). Esse valor pode ser pago à vista ou abatido mensalmente do repasse.

**O que implementar:**
- Cadastro de débito por clínica: descrição, valor total, data início (valor livre, não fixo)
- Card de saldo devedor na aba Clínicas do dashboard (valor total, pago, restante, barra de progresso)
- No modal de baixa de repasse: opção de abater parte do valor no saldo devedor
- Histórico de abatimentos por mês
- Visão somente leitura no dashboard do parceiro

**Dados necessários:**
- Nova tabela `debito_parceiro` (clinica_id, descricao, valor_total, valor_pago, data_inicio, status)
- Nova tabela `abatimentos_debito` (debito_id, mes_referencia, valor_abatido, repasse_id)

---

## 5. Comissão da Dentista (Beauty Smile)

**Contexto:** A Beauty Smile paga comissão para a dentista responsável por cada unidade. O valor sai da parte da BS (não do split da clínica). Tiers por volume de vendas no mês, com percentuais e limites editáveis.

**Regras de tier (configuráveis):**
- Até 7 vendas → 2,0% do faturamento bruto
- 8 a 12 vendas → 2,5%
- Acima de 12 vendas → 3,0%

**O que implementar:**
- Tabela `config_comissao_dentista` com limites e percentuais dos tiers (vigência igual ao `configuracoes_financeiras`)
- Tabela `comissoes_dentista` com registro mensal por clínica (qtde vendas, tier, valor, status)
- Cálculo automático ao fechar resumo mensal (via `lib/resumo-calculo.ts`)
- Impacto no DRE: nova linha "(-) Comissão Dentista" dentro da parcela Beauty Smile
- Página `app/admin/comissoes-dentista/`: listagem, KPIs, dar baixa com data + observação
- Seção de configuração de tiers em `app/admin/configuracoes/`

---

## 6. Página de Comissões Médicas

**Contexto:** Controlar o pagamento de comissões para cada médico indicador e registrar a baixa quando pago.

**O que implementar:**
- Rota `app/admin/comissoes/` com lista de comissões por período
- Filtros: mês, clínica, médico indicador, status (pendente / pago)
- KPIs: total a pagar no mês, total pago, médicos com pendência
- Botão "Dar baixa" em cada comissão pendente — registra data + observação
- Agrupamento por médico com drill-down por orçamento

**Dados necessários:**
- Nova tabela `pagamentos_comissao` (medico_indicador_id, clinica_id, mes_referencia, valor_comissao, status, data_pagamento)

---

## 6. Exportar Relatório PDF

**Contexto:** Gerar PDF mensal para enviar à clínica parceira com o resumo do período.

**O que implementar:**
- Botão "Exportar PDF" no header do dashboard (admin e parceiro)
- Conteúdo: cabeçalho (logo + clínica + período), DRE, repasse, top procedimentos, top tratamentos vendidos
- Incluir saldo devedor e abatimento do mês (quando houver)
- Nomeclatura: `relatorio-[clinica]-[mes-ano].pdf`

**Implementação:** `@react-pdf/renderer` ou `jsPDF` + `html2canvas`

---

## Backlog Menor

| # | Ideia | Prioridade |
|---|-------|-----------|
| - | Filtros do dashboard: todos meses 2026 + filtro por unidade + auto-recalc | Alta |
| - | Aba Vendas: tabela de tratamentos vendidos com % faturamento | Média |
| - | Aba Vendas: gráfico de evolução por tratamento (top 5, últimos 3–6 meses) | Média |
| - | Revisão de procedimentos: excluir linha individual + excluir seleção múltipla | Alta |
| - | Webhook recálculo resumo após pagamento/estorno (n8n) | Alta |
| - | Documentação de criação de usuário parceiro | Média |
| - | Deploy Vercel (dash.bslabs.com.br) | Alta |
| - | Testes E2E com usuário parceiro real | Média |
| - | Configuração dos workflows n8n (WF1–WF4) | Alta |
| - | Notificações Telegram (bot) | Baixa |

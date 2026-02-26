# PRD Fase 3: Dashboards e Calculo Financeiro

## 1. Introducao/Overview

Esta PRD cobre os **dashboards admin e parceiro** e o **motor de calculo financeiro** do Beauty Smile Partners Dashboard. E a fase que transforma dados brutos (importados na Fase 2) em informacao financeira visual e acionavel.

**Problema**: Mesmo com dados importados, sem um dashboard consolidado a Beauty Smile precisa abrir tabelas no banco para entender a situacao financeira. E os parceiros nao tem visibilidade nenhuma dos seus numeros.

**O que esta fase entrega**:
- Dashboard admin com KPIs consolidados, graficos de evolucao e ranking de clinicas
- Drill-down por clinica com orcamentos, tratamentos e resumo financeiro
- Motor de calculo que cruza todos os dados e gera o resumo mensal com o split 60/40
- Dashboard parceiro com visao restrita aos dados da propria clinica

**Pre-requisito**: Fase 1 (fundacao) e Fase 2 (upload e processamento de planilhas) concluidas.

---

## 2. Goals

1. Admin tem visao consolidada da operacao financeira de todas as clinicas em uma unica tela
2. Admin consegue fazer drill-down em qualquer clinica para ver detalhes (orcamentos, tratamentos, financeiro)
3. Motor de calculo gera o resumo mensal automaticamente com todas as deducoes e o split
4. Parceiro tem acesso ao dashboard da sua clinica com KPIs, orcamentos e financeiro (somente leitura)
5. Resumo mensal pode ser recalculado a qualquer momento (para correcoes)
6. Calculos conferem com a planilha Excel que a Beauty Smile usa hoje

---

## 3. User Stories

### US-18: Dashboard Admin - Visao Geral
**Como** administrador,
**quero** ver KPIs consolidados (faturamento, recebido, a receber, inadimplencia) de todas as clinicas,
**para** ter visao rapida da saude financeira da operacao.

### US-19: Dashboard Admin - Graficos
**Como** administrador,
**quero** ver graficos de faturamento vs recebimento ao longo dos meses,
**para** identificar tendencias e sazonalidades.

### US-20: Dashboard Admin - Ranking de Clinicas
**Como** administrador,
**quero** ver um ranking das clinicas por faturamento e valor liquido,
**para** comparar performance entre parceiros.

### US-21: Drill-down por Clinica
**Como** administrador,
**quero** clicar em uma clinica e ver todos os detalhes (orcamentos, tratamentos, financeiro),
**para** entender a situacao de cada parceiro individualmente.

### US-22: Calcular Resumo Mensal
**Como** administrador,
**quero** acionar o calculo do resumo financeiro mensal de uma clinica,
**para** gerar o split 60/40 e ter o fechamento do mes.

### US-23: Recalcular Resumo
**Como** administrador,
**quero** recalcular um resumo mensal ja existente,
**para** corrigir caso algum dado tenha sido ajustado apos o calculo original.

### US-24: Dashboard Parceiro - Visao da Clinica
**Como** parceiro,
**quero** ver os KPIs e detalhes financeiros da minha clinica,
**para** acompanhar a performance e o split sem depender de relatorios por email.

### US-25: Dashboard Parceiro - Orcamentos
**Como** parceiro,
**quero** ver a lista de orcamentos fechados e abertos da minha clinica,
**para** acompanhar o pipeline e o faturamento.

---

## 4. Functional Requirements

### 4.1 Dashboard Admin - Home (`/(admin)/dashboard/page.tsx`)

1. **Cards de KPIs** (valores do mes atual ou mes selecionado):
   - Faturamento Bruto (soma de `resumo_mensal.faturamento_bruto` de todas as clinicas)
   - Total Recebido no Mes (soma de `resumo_mensal.total_recebido_mes`)
   - Total a Receber (soma de `resumo_mensal.total_a_receber_mes`)
   - Total Inadimplente (soma de `resumo_mensal.total_inadimplente`)
   - Valor Liquido Total (soma de `resumo_mensal.valor_liquido`)
   - Parte Beauty Smile (soma de `resumo_mensal.valor_beauty_smile`)

2. **Seletor de periodo**: dropdown de mes/ano para filtrar os KPIs e graficos

3. **Grafico: Faturamento vs Recebimento** (ultimos 12 meses):
   - Grafico de barras ou linhas
   - Eixo X: meses
   - Eixo Y: valores em R$
   - Duas series: faturamento_bruto e total_recebido_mes
   - Dados agregados de todas as clinicas

4. **Grafico: Evolucao do Valor Liquido** (ultimos 12 meses):
   - Grafico de linha
   - Mostrar valor_liquido agregado por mes

5. **Ranking de Clinicas** (tabela do mes selecionado):
   - Colunas: Clinica, Faturamento Bruto, Valor Liquido, Parte BS (60%), Parte Clinica (40%), Status
   - Ordenado por faturamento_bruto decrescente
   - Clicavel: ao clicar, navega para drill-down da clinica

6. **Status dos Uploads do Mes** (checklist):
   - Para cada clinica: mostrar quais tipos de planilha ja foram uploadados no mes selecionado
   - Indicador visual: completo (4/4), parcial (N/4), nenhum (0/4)

### 4.2 Dashboard Admin - Drill-down por Clinica (`/(admin)/clinicas/[id]/page.tsx`)

7. **Header da clinica**: Nome, CNPJ, responsavel, status (ativa/inativa)

8. **Cards KPIs da clinica** (mes selecionado):
   - Faturamento Bruto
   - Custos Totais (procedimentos + mao de obra)
   - Valor Liquido
   - Parte Beauty Smile (60%)
   - Parte Clinica (40%)
   - Inadimplencia

9. **Aba: Orcamentos Fechados**:
   - Tabela: Paciente, Valor Total, Valor Pago, Valor em Aberto, Status, Data Fechamento, Indicacao
   - Filtros: por status (em_aberto, parcial, quitado), por mes
   - Ordenacao por valor_em_aberto decrescente (inadimplentes primeiro)

10. **Aba: Orcamentos Abertos** (pipeline):
    - Tabela: Paciente, Valor Total, Status, Data Criacao
    - Filtro por mes

11. **Aba: Tratamentos Executados**:
    - Tabela: Paciente, Procedimento, Quantidade, Data Execucao, Custo (se matched)
    - Filtro por mes
    - Highlight em amarelo para procedimentos sem match (`procedimento_id = NULL`)

12. **Aba: Resumo Financeiro**:
    - Tabela detalhada do resumo mensal (tipo extrato):
      ```
      Faturamento Bruto                    R$ XX.XXX,XX
      (-) Custos Procedimentos             R$ XX.XXX,XX
      (-) Custo Mao de Obra                R$ XX.XXX,XX
      (-) Taxa Cartao (X%)                 R$ XX.XXX,XX
      (-) Imposto NF (X%)                  R$ XX.XXX,XX
      (-) Comissoes Medicas                R$ XX.XXX,XX
      ─────────────────────────────────────────────────
      = Valor Liquido                      R$ XX.XXX,XX

      Parte Beauty Smile (60%)             R$ XX.XXX,XX
      Parte Clinica (40%)                  R$ XX.XXX,XX
      ```
    - Historico: tabela com resumos dos ultimos 12 meses
    - Botoes: "Calcular Resumo" (se nao existe) ou "Recalcular" (se ja existe)

### 4.3 Motor de Calculo Financeiro (n8n Workflow 2)

13. **Trigger**: Webhook POST do frontend com `{ clinica_id, mes_referencia }`

14. **Busca de dados** para o calculo (mes M, clinica C):
    - `orcamentos_fechados` WHERE clinica_id = C AND mes_referencia = M
    - `tratamentos_executados` WHERE clinica_id = C AND mes_referencia = M (com JOIN em `procedimentos` para custo_fixo)
    - `clinicas_parceiras` WHERE id = C (para custo_mao_de_obra e percentual_split)
    - `configuracoes_financeiras` WHERE vigencia_inicio <= M AND (vigencia_fim IS NULL OR vigencia_fim >= M) (configuracao vigente)
    - `pagamentos` WHERE clinica_id = C e vinculados a orcamentos do mes M (para total_recebido)
    - `parcelas_cartao` WHERE clinica_id = C e mes_recebimento = M e status = 'projetado' (para total_a_receber)

15. **Formula de calculo**:
    ```
    a. faturamento_bruto         = SUM(orcamentos_fechados.valor_total)
    b. total_custos_procedimentos = SUM(tratamentos_executados.quantidade * procedimentos.custo_fixo)
       -- Somente para tratamentos com procedimento_id matched
       -- Tratamentos sem match: custo = 0 (alerta no log)
    c. total_custo_mao_obra      = clinicas_parceiras.custo_mao_de_obra
    d. total_taxa_cartao         = faturamento_bruto * (configuracoes_financeiras.taxa_cartao_percentual / 100)
    e. total_imposto_nf          = faturamento_bruto * (configuracoes_financeiras.imposto_nf_percentual / 100)
    f. total_comissoes_medicas   = SUM(valor_total dos orcamentos com tem_indicacao = true)
                                   * (medico_indicador.percentual_comissao / 100)
       -- IMPORTANTE: Comissao calculada sobre o VALOR LIQUIDO do orcamento individual
       -- Valor liquido individual = valor_total - (custos_proc_proporcional + taxa_cartao_prop + imposto_prop)
       -- Simplificacao aceita: comissao = valor_total * percentual_comissao / 100
       -- Decisao final: comissao sobre VALOR LIQUIDO (conforme resposta do usuario)
    g. valor_liquido             = a - b - c - d - e - f
    h. valor_beauty_smile        = valor_liquido * (configuracoes_financeiras.percentual_beauty_smile / 100)
    i. valor_clinica             = valor_liquido * (clinicas_parceiras.percentual_split / 100)
    ```

    **Nota sobre comissao medica (sobre valor liquido)**:
    Para cada orcamento com `tem_indicacao = true` E `medico_indicador_id` preenchido:
    ```
    comissao_individual = (valor_liquido_proporcional_orcamento) * (percentual_comissao / 100)

    Onde valor_liquido_proporcional_orcamento:
      = valor_total_orcamento
        - (valor_total_orcamento / faturamento_bruto * total_custos_procedimentos)
        - (valor_total_orcamento / faturamento_bruto * total_taxa_cartao)
        - (valor_total_orcamento / faturamento_bruto * total_imposto_nf)
        - (valor_total_orcamento / faturamento_bruto * total_custo_mao_obra)

    total_comissoes_medicas = SUM(comissao_individual)
    ```

16. **Calculos de recebimento**:
    ```
    j. total_recebido_mes         = SUM(pagamentos.valor) WHERE data_pagamento no mes M
    k. total_a_receber_mes        = SUM(parcelas_cartao.valor_parcela) WHERE mes_recebimento = M AND status = 'projetado'
    l. total_inadimplente         = SUM(orcamentos_fechados.valor_em_aberto) WHERE status IN ('em_aberto', 'parcial')
    m. total_recebimentos_futuros = SUM(parcelas_cartao.valor_parcela) WHERE mes_recebimento > M AND status = 'projetado'
    ```

17. **Persistencia**:
    - UPSERT em `resumo_mensal` (clinica_id + mes_referencia como chave unica)
    - Se inserindo: `calculado_em = now()`, status = 'processado'
    - Se atualizando: `recalculado_em = now()`, manter `calculado_em` original

18. **Notificacao Telegram**:
    - Mensagem formatada:
      ```
      Resumo [mes] - [clinica]:
      Faturamento: R$ X
      Liquido: R$ Y
      BS (60%): R$ Z
      Clinica (40%): R$ W
      ```

### 4.4 API Routes

19. `POST /api/resumo/calcular`:
    - Body: `{ clinica_id, mes_referencia }`
    - Auth: somente admin
    - Chama webhook do n8n Workflow 2
    - Retorna status do processamento

20. `POST /api/resumo/recalcular`:
    - Body: `{ clinica_id, mes_referencia }`
    - Auth: somente admin
    - Mesma logica, mas faz upsert (atualiza se ja existe)
    - Retorna status

### 4.5 Dashboard Parceiro - Home (`/(parceiro)/dashboard/page.tsx`)

21. **Cards KPIs** (somente dados da clinica do parceiro logado):
    - Faturamento Bruto do Mes
    - Valor Liquido
    - Parte da Clinica (40%)
    - Total Inadimplente

22. **Grafico simplificado**: Faturamento e Parte Clinica dos ultimos 6 meses

23. **Seletor de mes** para navegar entre periodos

### 4.6 Dashboard Parceiro - Orcamentos (`/(parceiro)/orcamentos/page.tsx`)

24. **Orcamentos Fechados** (somente da clinica):
    - Tabela: Paciente, Valor Total, Valor Pago, Valor em Aberto, Status, Data
    - Filtro por mes e status
    - Somente leitura (sem acoes de pagamento)

25. **Orcamentos Abertos** (somente da clinica):
    - Tabela: Paciente, Valor Total, Status, Data
    - Filtro por mes

### 4.7 Dashboard Parceiro - Financeiro (`/(parceiro)/financeiro/page.tsx`)

26. **Resumo Financeiro do Mes**:
    - Mesma tabela "extrato" do drill-down admin (req 12), mas somente da clinica do parceiro
    - Historico dos ultimos 12 meses

---

## 5. Non-Goals (Out of Scope)

- **Registro de pagamentos** -- sera coberto na Fase 4 (parceiro ve orcamentos mas nao registra pagamentos)
- **Tela de inadimplencia dedicada** -- sera coberta na Fase 4 (parceiro ve valor inadimplente no KPI mas sem tela detalhada)
- **Exportacao de dados** (PDF, Excel) -- funcionalidade futura
- **Graficos avancados** (drill-down em graficos, graficos interativos) -- manter simples com recharts
- **Dashboard real-time** -- dados sao atualizados por upload/calculo, nao em tempo real
- **Comparativo entre clinicas no dashboard parceiro** -- parceiro so ve seus dados

---

## 6. Design Considerations

### Templates do Design System:
- **DashboardAdmin** -- Home admin com KPIs e graficos
- **ListWithFilters** -- Listas de orcamentos, tratamentos
- **DetailView** -- Drill-down da clinica

### Biblioteca de Graficos:
- Recharts (React) -- leve, customizavel, boa integracao com Next.js
- Graficos responsivos (adaptar a telas menores)

### UX do Dashboard Admin:
- Cards KPI no topo com valores grandes e legíveis
- Graficos logo abaixo dos KPIs
- Ranking/tabela de clinicas na parte inferior
- Seletor de mes sempre visivel no topo direito

### UX do Dashboard Parceiro:
- Layout mais limpo e simples que o admin
- Glass morphism para diferenciacao visual (conforme design system)
- Sem acoes de escrita (tudo somente leitura)
- Enfase nos valores "Parte da Clinica" (e o que importa para o parceiro)

### Formatacao de Valores:
- Sempre formato brasileiro: R$ 14.450,00
- Valores negativos em vermelho
- Percentuais com 1 casa decimal: 60,0%

---

## 7. Technical Considerations

### Dependencias adicionais:
- `recharts` -- biblioteca de graficos React
- n8n Workflow 2 configurado

### Performance:
- Dashboard le de `resumo_mensal` (tabela pre-calculada), NAO faz calculos em tempo real
- Graficos de 12 meses: no maximo 12 * N_clinicas registros (baixo volume)
- Queries com indexes em `clinica_id + mes_referencia` (ja criados na Fase 1)

### Calculo de Comissao (regra complexa):
- A comissao sobre valor liquido requer calculo proporcional por orcamento
- Implementar como funcao isolada no n8n para facilitar debug e ajustes
- Logar detalhes do calculo de comissao para auditoria

### Calculo Automatico:
- Quando os 2 uploads de uma clinica/mes estiverem concluidos (Orcamentos + Tratamentos), o calculo do resumo mensal e disparado automaticamente via n8n
- O admin ainda pode recalcular manualmente a qualquer momento (botao "Recalcular")

### Dados Vazios:
- Meses sem dados aparecem com valores zerados nos graficos (nao sao omitidos)
- Se nao existe resumo para o mes selecionado, mostrar KPIs zerados com mensagem "Resumo nao calculado para este periodo"
- Se nao existem dados de upload, mostrar "Nenhum dado importado para este periodo"

### Mobile:
- Dashboards NAO precisam funcionar em celular/tablet nesta fase (desktop only)
- Layout responsivo basico e suficiente (nao quebrar em telas menores, mas sem otimizacao mobile)

### RLS nos Dashboards:
- Dashboard parceiro: queries feitas com client autenticado (Supabase filtra via RLS automaticamente)
- Dashboard admin: queries retornam dados de todas as clinicas (is_admin() = true)
- NAO precisa de filtro manual por clinica_id no codigo do parceiro -- RLS cuida disso

---

## 8. Success Metrics

1. **Dashboard admin carrega <2s**: Home com KPIs e graficos renderiza rapidamente
2. **Calculo confere com Excel**: Resumo mensal calculado bate com os numeros da planilha manual da Beauty Smile (validar com gerente financeiro nos primeiros 3 meses)
3. **Isolamento de dados**: Parceiro logado ve somente dados da sua clinica (testar acessando URLs de outra clinica)
4. **Drill-down funcional**: Admin navega de visao geral → clinica especifica → orcamentos/tratamentos/financeiro sem fricao
5. **Parceiro satisfeito**: Parceiro consegue consultar seus numeros sem precisar pedir relatorio por email
6. **Recalculo funciona**: Admin consegue recalcular resumo e os numeros atualizam corretamente

---

## 9. Open Questions

Todas as questoes iniciais foram respondidas:

| # | Questao | Resposta |
|---|---------|----------|
| 1 | Base de calculo da comissao? | Sim, comissao calculada sobre valor liquido com deducoes proporcionais por orcamento (formula completa conforme req 15) |
| 2 | Meses sem dados? | Aparecem com valores zerados nos graficos (nao sao omitidos) |
| 3 | Periodo do grafico? | 12 meses e suficiente |
| 4 | Calculo automatico vs manual? | Automatico -- dispara quando os 2 uploads (Orcamentos + Tratamentos) do mes estiverem completos. Recalculo manual tambem disponivel |
| 5 | Versao mobile? | Nao precisa nesta fase (desktop only, layout responsivo basico) |

**Sem questoes pendentes para esta fase.**

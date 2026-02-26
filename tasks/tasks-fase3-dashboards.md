## Relevant Files

- `src/app/(admin)/dashboard/page.tsx` - Dashboard admin Home com KPIs consolidados, graficos e ranking de clinicas
- `src/app/(admin)/clinicas/[id]/page.tsx` - Drill-down por clinica com header, KPIs, abas (orcamentos, tratamentos, financeiro)
- `src/app/(admin)/clinicas/[id]/components/OrcamentosFechados.tsx` - Aba de orcamentos fechados com tabela e filtros
- `src/app/(admin)/clinicas/[id]/components/OrcamentosAbertos.tsx` - Aba de orcamentos abertos (pipeline)
- `src/app/(admin)/clinicas/[id]/components/TratamentosExecutados.tsx` - Aba de tratamentos com highlight de sem match
- `src/app/(admin)/clinicas/[id]/components/ResumoFinanceiro.tsx` - Aba de resumo financeiro tipo extrato com botoes calcular/recalcular
- `src/app/api/resumo/calcular/route.ts` - API Route POST para acionar calculo do resumo mensal via n8n
- `src/app/api/resumo/recalcular/route.ts` - API Route POST para recalcular resumo mensal existente via n8n
- `src/app/(parceiro)/dashboard/page.tsx` - Dashboard parceiro com KPIs, grafico simplificado e seletor de mes
- `src/app/(parceiro)/orcamentos/page.tsx` - Orcamentos do parceiro (fechados e abertos, somente leitura)
- `src/app/(parceiro)/financeiro/page.tsx` - Resumo financeiro do parceiro com historico de 12 meses
- `src/components/dashboard/KpiCard.tsx` - Componente reutilizavel de card KPI com valor formatado em R$
- `src/components/dashboard/PeriodoSelector.tsx` - Seletor de periodo (mes/ano) reutilizavel
- `src/components/dashboard/ChartFaturamentoRecebimento.tsx` - Grafico de barras Faturamento vs Recebimento (recharts)
- `src/components/dashboard/ChartEvolucaoLiquido.tsx` - Grafico de linha Evolucao do Valor Liquido (recharts)
- `src/components/dashboard/RankingClinicas.tsx` - Tabela ranking de clinicas clicavel
- `src/components/dashboard/StatusUploads.tsx` - Checklist de status de uploads do mes por clinica
- `src/lib/formatters.ts` - Helpers de formatacao: moeda brasileira (R$), percentuais, datas
- `src/lib/formatters.test.ts` - Testes dos helpers de formatacao
- `src/lib/dashboard-queries.ts` - Queries Supabase para dashboards (admin e parceiro)
- `src/types/dashboard.types.ts` - Tipos TypeScript para KPIs, graficos, ranking, resumo financeiro
- `src/types/database.types.ts` - Types gerados do Supabase (ja existente, pode precisar regenerar)

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- Biblioteca de graficos: `recharts` (React) — leve, customizavel, boa integracao com Next.js. Instalar com `npm install recharts`.
- Dashboards leem de `resumo_mensal` (tabela pre-calculada), NAO fazem calculos em tempo real.
- Formatacao de valores sempre no formato brasileiro: R$ 14.450,00 — valores negativos em vermelho.
- Percentuais com 1 casa decimal: 60,0%.
- Dashboard parceiro: queries feitas com client autenticado (Supabase filtra via RLS automaticamente). NAO precisa de filtro manual por clinica_id no codigo do parceiro.
- Mobile NAO e prioridade nesta fase — desktop only, layout responsivo basico suficiente.
- Pre-requisito: Fase 1 (fundacao) e Fase 2 (upload e processamento) concluidas.
- O design system `@beautysmile/design-system` fornece templates DashboardAdmin, ListWithFilters e DetailView.
- Meses sem dados aparecem com valores zerados nos graficos (nao sao omitidos).
- Se nao existe resumo para o mes selecionado, mostrar KPIs zerados com mensagem "Resumo nao calculado para este periodo".

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Criar e fazer checkout de uma nova branch: `git checkout -b feature/fase3-dashboards`

- [ ] 1.0 Instalar dependencias e criar estrutura base
  - [ ] 1.1 Instalar recharts: `npm install recharts`
  - [ ] 1.2 Criar `src/lib/formatters.ts` com helpers de formatacao: (a) `formatCurrency(value: number): string` — formata para R$ brasileiro (ex: 14450.5 → "R$ 14.450,50"), valores negativos com sinal e cor vermelha; (b) `formatPercent(value: number): string` — formata com 1 casa decimal (ex: 60 → "60,0%"); (c) `formatMesAno(mesReferencia: string): string` — formata "2026-03" para "Mar/2026"; (d) `parseMesAno(mesReferencia: string): { mes: number, ano: number }` — extrai mes e ano
  - [ ] 1.3 Criar `src/lib/formatters.test.ts` com testes unitarios para cada funcao: valores positivos, negativos, zero, centavos, valores grandes (milhoes)
  - [ ] 1.4 Criar `src/types/dashboard.types.ts` com interfaces: (a) `KpiData` — { label, value, previousValue?, trend? }; (b) `ChartDataPoint` — { mesReferencia, faturamentoBruto, totalRecebidoMes }; (c) `RankingClinica` — { clinicaId, clinicaNome, faturamentoBruto, valorLiquido, valorBeautySmile, valorClinica, status }; (d) `ResumoMensalCompleto` — tipo completo do resumo mensal com todos os campos; (e) `UploadStatus` — { clinicaId, clinicaNome, tipos: { orcamentos: boolean, tratamentos: boolean, abertos: boolean, recebimentos: boolean } }
  - [ ] 1.5 Criar `src/components/dashboard/KpiCard.tsx` — componente reutilizavel que recebe: label (string), value (number), format ('currency' | 'percent' | 'number'), previousValue (opcional, para mostrar variacao). Exibir valor grande e legivel, label menor abaixo
  - [ ] 1.6 Criar `src/components/dashboard/PeriodoSelector.tsx` — dropdown de mes/ano que gera lista dos ultimos 12 meses a partir do mes atual. Props: `selectedPeriodo: string`, `onChange: (periodo: string) => void`. Formato do valor: "YYYY-MM"

- [ ] 2.0 Dashboard Admin - Home
  - [ ] 2.1 Criar `src/lib/dashboard-queries.ts` com funcao `fetchKpisAdmin(mesReferencia: string)` — query em `resumo_mensal` WHERE mes_referencia = param, agregar SUM de: faturamento_bruto, total_recebido_mes, total_a_receber_mes, total_inadimplente, valor_liquido, valor_beauty_smile de todas as clinicas
  - [ ] 2.2 Adicionar funcao `fetchChartDataAdmin(mesesAtras: number = 12)` — query em `resumo_mensal` agrupado por mes_referencia, retornar array de { mesReferencia, faturamentoBruto, totalRecebidoMes } para os ultimos N meses (todas as clinicas somadas). Ordenar por mesReferencia ASC. Incluir meses sem dados com valores zerados
  - [ ] 2.3 Adicionar funcao `fetchChartLiquidoAdmin(mesesAtras: number = 12)` — query em `resumo_mensal` agrupado por mes_referencia, retornar array de { mesReferencia, valorLiquido } para os ultimos N meses
  - [ ] 2.4 Adicionar funcao `fetchRankingClinicas(mesReferencia: string)` — query em `resumo_mensal` JOIN `clinicas_parceiras`, retornar array de RankingClinica ordenado por faturamento_bruto DESC
  - [ ] 2.5 Adicionar funcao `fetchStatusUploads(mesReferencia: string)` — query em `upload_batches` agrupado por clinica_id e tipo, retornar para cada clinica quais tipos ja foram uploadados no mes
  - [ ] 2.6 Editar `src/app/(admin)/dashboard/page.tsx` (substituir placeholder): adicionar PeriodoSelector no topo direito da pagina com estado controlado (default = mes atual)
  - [ ] 2.7 Implementar secao de KPI cards (6 cards): Faturamento Bruto, Total Recebido, Total a Receber, Total Inadimplente, Valor Liquido Total, Parte Beauty Smile. Usar componente KpiCard para cada um. Dados vem de `fetchKpisAdmin`
  - [ ] 2.8 Criar `src/components/dashboard/ChartFaturamentoRecebimento.tsx` — grafico de barras com recharts (BarChart): eixo X = meses (formatado "Mar/26"), eixo Y = valores em R$, duas series (Faturamento Bruto em azul, Total Recebido em verde). Usar ResponsiveContainer para responsividade. Tooltip formatado em R$
  - [ ] 2.9 Criar `src/components/dashboard/ChartEvolucaoLiquido.tsx` — grafico de linha com recharts (LineChart): eixo X = meses, eixo Y = valores em R$, uma serie (Valor Liquido em azul escuro). Tooltip formatado em R$
  - [ ] 2.10 Integrar ambos os graficos no dashboard abaixo dos KPIs, lado a lado em grid (2 colunas em desktop)
  - [ ] 2.11 Criar `src/components/dashboard/RankingClinicas.tsx` — tabela com colunas: Clinica, Faturamento Bruto (R$), Valor Liquido (R$), Parte BS 60% (R$), Parte Clinica 40% (R$), Status (badge ativa/inativa). Cada linha clicavel — ao clicar, navegar para `/(admin)/clinicas/[id]` usando `router.push`
  - [ ] 2.12 Criar `src/components/dashboard/StatusUploads.tsx` — para cada clinica, exibir checklist visual: indicador completo (4/4 tipos uploadados = verde), parcial (N/4 = amarelo), nenhum (0/4 = vermelho). Usar icones ou badges
  - [ ] 2.13 Integrar RankingClinicas e StatusUploads no dashboard abaixo dos graficos
  - [ ] 2.14 Conectar PeriodoSelector para que ao mudar o mes, todos os KPIs, graficos e ranking recarreguem com os novos dados. Graficos sempre mostram ultimos 12 meses a partir do mes selecionado
  - [ ] 2.15 Tratar estado vazio: se nao existem dados para o mes selecionado, exibir KPIs zerados com mensagem "Resumo nao calculado para este periodo" e graficos vazios com eixos visiveis

- [ ] 3.0 Dashboard Admin - Drill-down por Clinica
  - [ ] 3.1 Criar `src/app/(admin)/clinicas/[id]/page.tsx` usando template DetailView do design system. Receber `id` da clinica via params
  - [ ] 3.2 Implementar header da clinica: buscar dados de `clinicas_parceiras` WHERE id = param. Exibir nome, CNPJ, responsavel, email, telefone, status (badge ativa/inativa)
  - [ ] 3.3 Adicionar PeriodoSelector no topo direito (mesmo componente da Home)
  - [ ] 3.4 Implementar cards KPIs da clinica (6 cards, mes selecionado): Faturamento Bruto, Custos Totais (procedimentos + mao de obra), Valor Liquido, Parte Beauty Smile (60%), Parte Clinica (40%), Inadimplencia. Buscar de `resumo_mensal` WHERE clinica_id = param AND mes_referencia = mesSelecionado
  - [ ] 3.5 Implementar navegacao por abas (Tabs): "Orcamentos Fechados", "Orcamentos Abertos", "Tratamentos Executados", "Resumo Financeiro"
  - [ ] 3.6 Criar `src/app/(admin)/clinicas/[id]/components/OrcamentosFechados.tsx` — tabela com colunas: Paciente, Valor Total (R$), Valor Pago (R$), Valor em Aberto (R$), Status (badge em_aberto/parcial/quitado), Data Fechamento, Indicacao (sim/nao). Query em `orcamentos_fechados` WHERE clinica_id = param AND mes_referencia = mesSelecionado
  - [ ] 3.7 Adicionar filtros na aba Orcamentos Fechados: filtro por status (dropdown: em_aberto, parcial, quitado, todos), filtro por mes (ja controlado pelo PeriodoSelector). Ordenacao padrao: valor_em_aberto DESC (inadimplentes primeiro)
  - [ ] 3.8 Criar `src/app/(admin)/clinicas/[id]/components/OrcamentosAbertos.tsx` — tabela com colunas: Paciente, Valor Total (R$), Status, Data Criacao. Query em `orcamentos_abertos` WHERE clinica_id = param AND mes_referencia = mesSelecionado. Filtro por mes
  - [ ] 3.9 Criar `src/app/(admin)/clinicas/[id]/components/TratamentosExecutados.tsx` — tabela com colunas: Paciente, Procedimento, Quantidade, Data Execucao, Custo (R$, se matched). Query em `tratamentos_executados` LEFT JOIN `procedimentos` WHERE clinica_id = param AND mes_referencia = mesSelecionado. Filtro por mes
  - [ ] 3.10 Implementar highlight em amarelo para tratamentos sem match (procedimento_id IS NULL) na tabela de tratamentos. Exibir tooltip "Procedimento nao encontrado — custo nao contabilizado"
  - [ ] 3.11 Criar `src/app/(admin)/clinicas/[id]/components/ResumoFinanceiro.tsx` — tabela tipo extrato detalhado do mes selecionado, formato:
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
    Buscar de `resumo_mensal` WHERE clinica_id = param AND mes_referencia = mesSelecionado
  - [ ] 3.12 Adicionar tabela de historico na aba Resumo Financeiro: listar resumos dos ultimos 12 meses com colunas: Mes (formatado), Faturamento Bruto, Valor Liquido, Parte BS, Parte Clinica, Status (badge processado/revisao), Calculado Em
  - [ ] 3.13 Adicionar botoes na aba Resumo Financeiro: "Calcular Resumo" (exibir se NAO existe resumo para o mes) ou "Recalcular" (exibir se ja existe resumo). Ambos chamam as API routes da task 4.0. Mostrar loading state durante o calculo e atualizar os dados ao concluir
  - [ ] 3.14 Tratar estado vazio no drill-down: se clinica nao tem dados para o mes, exibir mensagem "Nenhum dado importado para este periodo" nas abas e KPIs zerados

- [ ] 4.0 Motor de Calculo Financeiro e API Routes
  - [ ] 4.1 Criar `src/app/api/resumo/calcular/route.ts` com handler POST: recebe body `{ clinica_id, mes_referencia }`, valida campos obrigatorios, verifica autenticacao e role admin (rejeitar com 403 se nao for admin)
  - [ ] 4.2 Implementar chamada ao webhook n8n (Workflow 2) via fetch: enviar `{ clinica_id, mes_referencia, action: 'calcular' }` para a URL do webhook n8n. Retornar status 202 (accepted) com mensagem de processamento iniciado
  - [ ] 4.3 Criar `src/app/api/resumo/recalcular/route.ts` com handler POST: mesma estrutura do calcular, mas envia `{ clinica_id, mes_referencia, action: 'recalcular' }`. Verificar que ja existe resumo para o mes (retornar 404 se nao existe). Retornar status 202
  - [ ] 4.4 Criar n8n Workflow 2 ("WF2: Calculo Resumo Mensal") com trigger Webhook POST recebendo `{ clinica_id, mes_referencia, action }`
  - [ ] 4.5 Adicionar node de busca de dados no n8n: (a) `orcamentos_fechados` WHERE clinica_id = C AND mes_referencia = M; (b) `tratamentos_executados` WHERE clinica_id = C AND mes_referencia = M com JOIN em `procedimentos` para custo_fixo; (c) `clinicas_parceiras` WHERE id = C (para custo_mao_de_obra e percentual_split); (d) `configuracoes_financeiras` WHERE vigencia_inicio <= M AND (vigencia_fim IS NULL OR vigencia_fim >= M); (e) `pagamentos` WHERE clinica_id = C e vinculados a orcamentos do mes M; (f) `parcelas_cartao` WHERE clinica_id = C AND mes_recebimento = M AND status = 'projetado'
  - [ ] 4.6 Implementar calculo principal no n8n (Code node JavaScript):
    ```
    a. faturamento_bruto = SUM(orcamentos_fechados.valor_total)
    b. total_custos_procedimentos = SUM(tratamentos.quantidade * procedimentos.custo_fixo)
       — Somente para tratamentos com procedimento_id matched (nao NULL)
       — Tratamentos sem match: custo = 0, gerar log de alerta
    c. total_custo_mao_obra = clinicas_parceiras.custo_mao_de_obra
    d. total_taxa_cartao = faturamento_bruto * (config.taxa_cartao_percentual / 100)
    e. total_imposto_nf = faturamento_bruto * (config.imposto_nf_percentual / 100)
    ```
  - [ ] 4.7 Implementar calculo de comissao medica sobre valor liquido no n8n (Code node):
    Para cada orcamento com tem_indicacao = true E medico_indicador_id preenchido:
    ```
    proporcao_orcamento = valor_total_orcamento / faturamento_bruto
    valor_liquido_proporcional = valor_total_orcamento
      - (proporcao_orcamento * total_custos_procedimentos)
      - (proporcao_orcamento * total_taxa_cartao)
      - (proporcao_orcamento * total_imposto_nf)
      - (proporcao_orcamento * total_custo_mao_obra)
    comissao_individual = valor_liquido_proporcional * (medico.percentual_comissao / 100)
    ```
    `total_comissoes_medicas = SUM(comissao_individual)`
  - [ ] 4.8 Implementar calculo do split no n8n:
    ```
    g. valor_liquido = a - b - c - d - e - f
    h. valor_beauty_smile = valor_liquido * (config.percentual_beauty_smile / 100)
    i. valor_clinica = valor_liquido * (clinica.percentual_split / 100)
    ```
  - [ ] 4.9 Implementar calculos de recebimento no n8n:
    ```
    j. total_recebido_mes = SUM(pagamentos.valor) WHERE data_pagamento no mes M
    k. total_a_receber_mes = SUM(parcelas_cartao.valor_parcela) WHERE mes_recebimento = M AND status = 'projetado'
    l. total_inadimplente = SUM(orcamentos_fechados.valor_em_aberto) WHERE status IN ('em_aberto', 'parcial')
    m. total_recebimentos_futuros = SUM(parcelas_cartao.valor_parcela) WHERE mes_recebimento > M AND status = 'projetado'
    ```
  - [ ] 4.10 Implementar persistencia no n8n: UPSERT em `resumo_mensal` usando clinica_id + mes_referencia como chave unica. Se inserindo: calculado_em = now(), status = 'processado'. Se atualizando (recalculo): recalculado_em = now(), manter calculado_em original
  - [ ] 4.11 Adicionar notificacao Telegram no n8n ao final do calculo:
    ```
    Resumo [mes] - [clinica]:
    Faturamento: R$ X
    Liquido: R$ Y
    BS (60%): R$ Z
    Clinica (40%): R$ W
    ```
  - [ ] 4.12 Adicionar tratamento de erros no n8n: se alguma query retorna vazio ou ocorre erro no calculo, logar detalhes e enviar notificacao Telegram de erro. NAO gravar resumo com dados incorretos
  - [ ] 4.13 Configurar calculo automatico no n8n: adicionar logica que verifica, apos upload concluido (WF1), se os 2 tipos obrigatorios (orcamentos_fechados + tratamentos_executados) ja foram uploadados para a clinica/mes. Se sim, disparar automaticamente o calculo do resumo mensal
  - [ ] 4.14 Testar o workflow manualmente no n8n com dados de teste: enviar webhook com clinica_id e mes_referencia validos, verificar que o resumo_mensal foi criado/atualizado corretamente, conferir notificacao no Telegram

- [ ] 5.0 Dashboard Parceiro
  - [ ] 5.1 Adicionar funcoes em `src/lib/dashboard-queries.ts`: `fetchKpisParceiro(mesReferencia: string)` — query em `resumo_mensal` WHERE mes_referencia = param (RLS filtra automaticamente pela clinica do parceiro logado). Retornar: faturamento_bruto, valor_liquido, valor_clinica, total_inadimplente
  - [ ] 5.2 Adicionar funcao `fetchChartParceiro(mesesAtras: number = 6)` — query em `resumo_mensal` dos ultimos 6 meses, retornar array de { mesReferencia, faturamentoBruto, valorClinica }. RLS filtra automaticamente
  - [ ] 5.3 Editar `src/app/(parceiro)/dashboard/page.tsx` (substituir placeholder): adicionar PeriodoSelector no topo direito
  - [ ] 5.4 Implementar 4 KPI cards: Faturamento Bruto do Mes, Valor Liquido, Parte da Clinica (40%) com destaque visual (e o que importa para o parceiro), Total Inadimplente
  - [ ] 5.5 Implementar grafico simplificado com recharts: grafico de barras com 2 series — Faturamento e Parte Clinica dos ultimos 6 meses. Usar componente BarChart com ResponsiveContainer
  - [ ] 5.6 Tratar estado vazio: se nao existe resumo, exibir KPIs zerados com "Resumo nao disponivel para este periodo"
  - [ ] 5.7 Criar `src/app/(parceiro)/orcamentos/page.tsx` usando template ListWithFilters. Implementar 2 secoes (tabs ou accordion):
  - [ ] 5.8 Secao "Orcamentos Fechados": tabela com colunas Paciente, Valor Total (R$), Valor Pago (R$), Valor em Aberto (R$), Status (badge), Data. Query em `orcamentos_fechados` WHERE mes_referencia = mesSelecionado (RLS filtra clinica). Filtro por mes e status. Somente leitura (sem acoes)
  - [ ] 5.9 Secao "Orcamentos Abertos": tabela com colunas Paciente, Valor Total (R$), Status, Data. Query em `orcamentos_abertos` WHERE mes_referencia = mesSelecionado. Filtro por mes. Somente leitura
  - [ ] 5.10 Criar `src/app/(parceiro)/financeiro/page.tsx` — exibir resumo financeiro do mes selecionado no mesmo formato "extrato" da aba ResumoFinanceiro do drill-down admin (req 12 do PRD), mas sem botoes de calcular/recalcular (somente leitura)
  - [ ] 5.11 Adicionar tabela de historico: listar resumos dos ultimos 12 meses com colunas Mes, Faturamento Bruto, Valor Liquido, Parte Clinica. Query em `resumo_mensal` ORDER BY mes_referencia DESC LIMIT 12 (RLS filtra)
  - [ ] 5.12 Adicionar PeriodoSelector na pagina de financeiro para navegar entre periodos

- [ ] 6.0 Testes e validacao
  - [ ] 6.1 Testar dashboard admin Home: verificar que KPIs mostram soma de todas as clinicas, graficos renderizam 12 meses, ranking lista todas as clinicas ordenadas, seletor de periodo atualiza todos os dados
  - [ ] 6.2 Testar drill-down: clicar em clinica no ranking → navegar para pagina de detalhe → verificar header, KPIs individuais, todas as 4 abas com dados corretos
  - [ ] 6.3 Testar aba Orcamentos Fechados: verificar filtros por status, ordenacao por inadimplencia, valores formatados corretamente em R$
  - [ ] 6.4 Testar aba Tratamentos Executados: verificar highlight amarelo nos tratamentos sem match (procedimento_id NULL)
  - [ ] 6.5 Testar aba Resumo Financeiro: verificar extrato detalhado, botao Calcular (quando nao existe resumo) e Recalcular (quando ja existe), verificar que valores atualizam apos calculo
  - [ ] 6.6 Testar motor de calculo: executar calculo para uma clinica de teste e conferir cada linha do extrato vs calculo manual (planilha Excel). Verificar: faturamento bruto, custos procedimentos, mao de obra, taxa cartao, imposto NF, comissoes medicas (sobre valor liquido), valor liquido, split 60/40
  - [ ] 6.7 Testar recalculo: alterar dados de orcamento, recalcular e verificar que valores atualizam corretamente. Verificar que `recalculado_em` atualiza mas `calculado_em` mantem valor original
  - [ ] 6.8 Testar isolamento RLS no dashboard parceiro: fazer login como parceiro e verificar que ve somente KPIs, orcamentos e financeiro da propria clinica. Tentar acessar URL de outra clinica e verificar que RLS bloqueia
  - [ ] 6.9 Testar estados vazios: selecionar mes sem dados e verificar KPIs zerados com mensagem adequada em ambos os dashboards (admin e parceiro). Verificar graficos com eixos visiveis mas sem dados
  - [ ] 6.10 Testar calculo automatico: fazer upload dos 2 tipos obrigatorios (orcamentos + tratamentos) para uma clinica/mes e verificar que o calculo do resumo mensal e disparado automaticamente
  - [ ] 6.11 Testar formatacao: verificar que todos os valores monetarios usam formato R$ brasileiro, valores negativos em vermelho, percentuais com 1 casa decimal

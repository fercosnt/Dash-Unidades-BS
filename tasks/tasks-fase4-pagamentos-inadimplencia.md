## Relevant Files

- `supabase/migrations/004_rpc_pagamentos.sql` - Migration com RPC functions `registrar_pagamento` e `estornar_pagamento` (logica atomica no banco)
- `src/app/api/pagamentos/route.ts` - API Route POST para registrar pagamento (chama RPC)
- `src/app/api/pagamentos/[id]/route.ts` - API Route DELETE para estornar pagamento (chama RPC)
- `src/components/pagamentos/RegistrarPagamentoModal.tsx` - Modal de registro de pagamento com formulario e validacoes
- `src/components/pagamentos/RegistrarPagamentoModal.test.tsx` - Testes do modal de pagamento
- `src/components/pagamentos/EstornarPagamentoModal.tsx` - Modal de confirmacao de estorno
- `src/components/pagamentos/HistoricoPagamentos.tsx` - Lista de pagamentos realizados de um orcamento
- `src/app/(admin)/inadimplencia/page.tsx` - Tela de inadimplencia admin (ListWithFilters + KPI cards)
- `src/app/(admin)/inadimplencia/[id]/page.tsx` - Detalhe do orcamento com historico de pagamentos e telefone
- `src/app/(admin)/pagamentos/page.tsx` - Tela de projecao de recebimentos futuros (timeline 12 meses)
- `src/app/(parceiro)/inadimplencia/page.tsx` - Tela de inadimplencia parceiro (read-only, scoped por clinica)
- `src/lib/pagamentos.ts` - Funcoes auxiliares (formatacao, validacao, calculo de parcelas)
- `src/lib/pagamentos.test.ts` - Testes das funcoes auxiliares de pagamento
- `src/types/database.types.ts` - Types atualizados do Supabase (regenerar apos migration)

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- Pre-requisito: Fases 1, 2 e 3 concluidas (fundacao, uploads, dashboards e calculo financeiro).
- O schema do banco (tabelas `pagamentos`, `parcelas_cartao`, views `vw_inadimplentes`, `vw_recebimentos_futuros`, enums `forma_pagamento`, `status_parcela`, trigger `update_orcamento_status`) ja devem existir das migracoes da Fase 1.
- O enum `forma_pagamento` deve conter apenas: `cartao_credito`, `cartao_debito`, `pix`, `dinheiro` (remover `boleto` e `transferencia` se existirem).
- Atomicidade e critica: criacao de pagamento + parcelas + atualizacao do orcamento devem ser feitas em transacao via RPC function no Supabase.
- Arredondamento de parcelas: cada parcela arredondada para 2 casas decimais; diferenca de centavos vai na ultima parcela.
- Logica D+30: parcela N recebe N meses apos o pagamento (primeira parcela = mes seguinte). Usar primeiro dia do mes como `mes_recebimento`.
- Apos registrar/estornar pagamento, disparar recalculo do `resumo_mensal` via webhook n8n (mesmo da Fase 3).
- O design system `@beautysmile/design-system` fornece templates ListWithFilters e DetailView para as telas.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Criar e fazer checkout de uma nova branch: `git checkout -b feature/fase4-pagamentos-inadimplencia`

- [ ] 1.0 Supabase RPC Function para Registro e Estorno de Pagamento
  - [ ] 1.1 Criar arquivo de migration `supabase/migrations/004_rpc_pagamentos.sql`
  - [ ] 1.2 Verificar se o enum `forma_pagamento` contem apenas `cartao_credito`, `cartao_debito`, `pix`, `dinheiro`. Se conter `boleto` ou `transferencia`, criar ALTER TYPE para remove-los
  - [ ] 1.3 Criar RPC function `registrar_pagamento(p_orcamento_fechado_id UUID, p_valor DECIMAL, p_forma forma_pagamento, p_parcelas INTEGER, p_data_pagamento DATE, p_registrado_por UUID)` que executa atomicamente: (a) valida que valor > 0, valor <= valor_em_aberto do orcamento, parcelas entre 1-12, data <= hoje; (b) insere registro em `pagamentos`; (c) se forma = cartao_credito E parcelas > 1, gera N registros em `parcelas_cartao` com arredondamento correto (diferenca na ultima parcela) e mes_recebimento = primeiro dia do mes (data_pagamento + N meses); (d) atualiza `orcamentos_fechados.valor_pago += valor` (o trigger `update_orcamento_status` cuida do status); (e) retorna o pagamento criado + parcelas geradas
  - [ ] 1.4 Implementar logica de arredondamento: `valor_parcela = ROUND(valor / parcelas, 2)` para parcelas 1..N-1, e ultima parcela = `valor - (valor_parcela * (parcelas - 1))` para garantir que a soma seja exata
  - [ ] 1.5 Implementar logica D+30: `mes_recebimento = DATE_TRUNC('month', data_pagamento) + (parcela_numero * INTERVAL '1 month')` — parcela 1 recebe no mes seguinte, parcela 2 dois meses depois, etc.
  - [ ] 1.6 Criar RPC function `estornar_pagamento(p_pagamento_id UUID)` que executa atomicamente: (a) busca o pagamento e seu valor; (b) deleta registros de `parcelas_cartao` vinculados (CASCADE ja cuida, mas ser explicito); (c) deleta o registro de `pagamentos`; (d) atualiza `orcamentos_fechados.valor_pago -= valor_do_pagamento` (trigger cuida do status); (e) retorna confirmacao
  - [ ] 1.7 Executar migration no Supabase e verificar que as functions foram criadas corretamente
  - [ ] 1.8 Testar manualmente as RPC functions com dados de teste (registrar pagamento a vista, parcelado 3x, 12x, e estornar)

- [ ] 2.0 API Routes de Pagamento (POST e DELETE)
  - [ ] 2.1 Criar `src/app/api/pagamentos/route.ts` com handler POST: recebe body `{ orcamento_fechado_id, valor, forma, parcelas, data_pagamento }`, valida campos obrigatorios no server-side
  - [ ] 2.2 Adicionar verificacao de autenticacao e role admin (rejeitar com 403 se nao for admin)
  - [ ] 2.3 Chamar RPC `registrar_pagamento` via Supabase client e retornar resultado (pagamento + parcelas) com status 201
  - [ ] 2.4 Tratar erros da RPC (valor excede saldo, orcamento nao encontrado, etc.) e retornar mensagens claras com status 400/404
  - [ ] 2.5 Criar `src/app/api/pagamentos/[id]/route.ts` com handler DELETE: recebe pagamento_id via params
  - [ ] 2.6 Adicionar verificacao de autenticacao e role admin no DELETE
  - [ ] 2.7 Chamar RPC `estornar_pagamento` via Supabase client e retornar confirmacao com status 200
  - [ ] 2.8 Apos sucesso do POST ou DELETE, disparar webhook n8n para recalculo do `resumo_mensal` (mesma URL da Fase 3, enviar `{ clinica_id, mes_referencia }`)

- [ ] 3.0 Modal de Registro de Pagamento
  - [ ] 3.1 Criar `src/components/pagamentos/RegistrarPagamentoModal.tsx` recebendo props: `orcamentoId`, `pacienteNome`, `valorTotal`, `valorEmAberto`, `clinicaId`, `onSuccess`, `onClose`
  - [ ] 3.2 Exibir no topo do modal (read-only): nome do paciente, valor total do orcamento, saldo em aberto (destaque visual)
  - [ ] 3.3 Implementar campo "Valor do pagamento" (R$, obrigatorio) com mascara monetaria brasileira
  - [ ] 3.4 Implementar dropdown "Forma de pagamento" com opcoes: Cartao Credito, Cartao Debito, PIX, Dinheiro
  - [ ] 3.5 Implementar campo "Numero de parcelas" (1-12) que so aparece quando forma = cartao_credito; para outras formas, setar parcelas = 1 automaticamente (campo escondido)
  - [ ] 3.6 Implementar campo "Data do pagamento" (date picker, default = hoje, maximo = hoje)
  - [ ] 3.7 Adicionar validacoes client-side: valor > 0, valor <= valorEmAberto, parcelas 1-12 (se cartao), data <= hoje
  - [ ] 3.8 Implementar submit: chamar POST `/api/pagamentos`, mostrar loading state no botao, exibir toast de sucesso com valor e forma, chamar `onSuccess()` para atualizar tabela pai
  - [ ] 3.9 Tratar erros do POST: exibir mensagem de erro no modal sem fechar

- [ ] 4.0 Estorno de Pagamento (UI)
  - [ ] 4.1 Criar `src/components/pagamentos/HistoricoPagamentos.tsx` que recebe `orcamentoFechadoId` e lista todos os pagamentos do orcamento (data, valor formatado, forma de pagamento, parcelas)
  - [ ] 4.2 Buscar pagamentos via Supabase query: `pagamentos WHERE orcamento_fechado_id = X ORDER BY data_pagamento DESC`
  - [ ] 4.3 Adicionar botao "Estornar" em cada linha de pagamento
  - [ ] 4.4 Criar `src/components/pagamentos/EstornarPagamentoModal.tsx` com modal de confirmacao: "Tem certeza que deseja estornar o pagamento de R$ X.XXX,XX de [data]? Esta acao nao pode ser desfeita."
  - [ ] 4.5 Implementar confirmacao: chamar DELETE `/api/pagamentos/[id]`, mostrar loading, exibir toast de sucesso, atualizar lista de pagamentos e dados do orcamento

- [ ] 5.0 Tela de Inadimplencia (Admin)
  - [ ] 5.1 Criar pagina `src/app/(admin)/inadimplencia/page.tsx` usando template ListWithFilters do design system
  - [ ] 5.2 Implementar KPI cards no topo: (a) Total inadimplente (soma de valor_em_aberto), (b) Quantidade de pacientes inadimplentes, (c) Maior valor individual em aberto, (d) Inadimplencia media por paciente
  - [ ] 5.3 Buscar dados da view `vw_inadimplentes` via Supabase query (a view ja agrega orcamentos com valor_em_aberto > 0 por paciente e clinica)
  - [ ] 5.4 Criar tabela principal com colunas: Paciente, Clinica, Valor Total (formatado R$), Valor Pago (formatado R$), Valor em Aberto (formatado R$), Dias em Aberto, Status (badge em_aberto/parcial)
  - [ ] 5.5 Implementar ordenacao padrao: valor_em_aberto decrescente (maiores devedores primeiro)
  - [ ] 5.6 Implementar filtro por clinica (dropdown com todas as clinicas)
  - [ ] 5.7 Implementar filtro por faixa de valor (opcoes: > R$ 1.000, > R$ 5.000, > R$ 10.000)
  - [ ] 5.8 Implementar filtro por tempo em aberto (opcoes: > 30 dias, > 60 dias, > 90 dias)
  - [ ] 5.9 Implementar filtro por status (em_aberto, parcial)
  - [ ] 5.10 Adicionar botao "Registrar Pagamento" em cada linha que abre o `RegistrarPagamentoModal` com orcamento pre-selecionado
  - [ ] 5.11 Adicionar botao "Ver Detalhes" em cada linha que navega para pagina de detalhe do orcamento
  - [ ] 5.12 Criar pagina de detalhe `src/app/(admin)/inadimplencia/[id]/page.tsx` usando template DetailView: informacoes do orcamento (paciente, valor total, data, profissional, procedimentos), telefone do paciente (para cobranca), componente `HistoricoPagamentos` com lista de pagamentos, saldo remanescente em destaque

- [ ] 6.0 Tela de Projecao de Recebimentos Futuros (Admin)
  - [ ] 6.1 Criar pagina `src/app/(admin)/pagamentos/page.tsx` usando template ListWithFilters do design system
  - [ ] 6.2 Buscar dados da view `vw_recebimentos_futuros` via Supabase query (agrupado por clinica e mes_recebimento, filtrado por status = 'projetado')
  - [ ] 6.3 Implementar tabela de projecao com colunas: Mes (formatado "Mar/2026"), Clinica, Total Projetado (formatado R$), Qtd Parcelas
  - [ ] 6.4 Implementar filtro por clinica (dropdown)
  - [ ] 6.5 Criar visualizacao de timeline/barra com recharts mostrando valor projetado por mes para os proximos 12 meses
  - [ ] 6.6 Exibir total geral projetado (soma de todos os meses) em card destaque
  - [ ] 6.7 Implementar drill-down por mes (ao clicar em um mes na tabela ou grafico): exibir lista de parcelas individuais com colunas Paciente, Orcamento, Parcela N/Total, Valor (formatado R$), Status (badge projetado/recebido)

- [ ] 7.0 Dashboard Parceiro - Inadimplencia e Projecao
  - [ ] 7.1 Criar pagina `src/app/(parceiro)/inadimplencia/page.tsx` (RLS garante que query retorna somente dados da clinica do parceiro)
  - [ ] 7.2 Implementar KPI cards: (a) Total inadimplente da clinica, (b) Quantidade de pacientes inadimplentes
  - [ ] 7.3 Criar tabela de inadimplentes (somente leitura, SEM botao de registrar pagamento): Paciente, Valor Total, Valor Pago, Valor em Aberto, Dias em Aberto
  - [ ] 7.4 Implementar filtros: faixa de valor e tempo em aberto
  - [ ] 7.5 Adicionar secao de projecao de recebimentos simplificada: tabela com colunas Mes, Total Projetado, Qtd Parcelas (proximos 6 meses apenas)
  - [ ] 7.6 Testar isolamento RLS: verificar que parceiro ve somente pacientes da sua clinica (fazer login como parceiro e confirmar que dados de outras clinicas nao aparecem)

- [ ] 8.0 n8n Workflow 3 - Auto-recebimento de Parcelas de Cartao
  - [ ] 8.1 Criar novo workflow no n8n com nome "WF3: Auto-recebimento Parcelas Cartao"
  - [ ] 8.2 Configurar trigger Schedule (Cron): `0 0 * * *` (todo dia a meia-noite), timezone America/Sao_Paulo
  - [ ] 8.3 Adicionar node Supabase/HTTP para executar query: `UPDATE parcelas_cartao SET status = 'recebido' WHERE mes_recebimento <= DATE_TRUNC('month', CURRENT_DATE) AND status = 'projetado'`
  - [ ] 8.4 Capturar quantidade de registros atualizados na resposta
  - [ ] 8.5 Adicionar node de log: "[N] parcelas de cartao marcadas como recebidas em [mes/ano]" (formatar mes/ano atual)
  - [ ] 8.6 Verificar idempotencia: executar o workflow 2x no mesmo dia e confirmar que a segunda execucao atualiza 0 registros (parcelas ja recebidas nao sao afetadas)
  - [ ] 8.7 Ativar o workflow em producao

- [ ] 9.0 Testes e Validacao Final
  - [ ] 9.1 Testar fluxo completo de pagamento: registrar pagamento a vista (PIX/dinheiro/debito) → verificar que valor_pago atualiza e status muda para parcial ou quitado
  - [ ] 9.2 Testar pagamento parcelado: registrar pagamento cartao credito 3x de R$ 1.000 → verificar que 3 parcelas sao geradas com valores R$ 333,33 + R$ 333,33 + R$ 333,34 e meses corretos (D+30)
  - [ ] 9.3 Testar pagamento parcelado 12x: verificar que 12 parcelas sao geradas com meses sequenciais e soma exata do valor
  - [ ] 9.4 Testar estorno: estornar pagamento parcelado → verificar que parcelas sao deletadas, valor_pago volta ao anterior, status do orcamento regride
  - [ ] 9.5 Testar validacoes: tentar registrar valor > saldo em aberto (deve falhar), valor = 0 (deve falhar), data futura (deve falhar), parcelas = 0 (deve falhar)
  - [ ] 9.6 Testar tela de inadimplencia: verificar que lista mostra somente pacientes com saldo em aberto, valores batem com o banco, filtros funcionam
  - [ ] 9.7 Testar projecao: verificar que valores projetados por mes batem com a soma das parcelas no banco
  - [ ] 9.8 Testar isolamento RLS: fazer login como parceiro e confirmar que ve somente dados da sua clinica (inadimplencia e projecao)
  - [ ] 9.9 Testar auto-recebimento n8n: criar parcelas com mes_recebimento no passado, executar workflow, verificar que status mudou para 'recebido'
  - [ ] 9.10 Testar recalculo resumo mensal: apos pagamento/estorno, verificar que o webhook n8n foi disparado e o resumo_mensal foi atualizado

## Relevant Files

- `src/lib/utils/xlsx-parser.ts` - Funcoes de parse XLSX com SheetJS (parseXLSX, detectar linha totalizadora, extrair dados da primeira aba)
- `src/lib/utils/xlsx-parser.test.ts` - Testes unitarios para xlsx-parser
- `src/lib/utils/xlsx-transforms.ts` - Funcoes de transformacao: transformOrcamentos (Anexo C.1) e transformTratamentos (Anexo C.2 com split por "+")
- `src/lib/utils/xlsx-transforms.test.ts` - Testes unitarios para funcoes de transformacao
- `src/lib/utils/formatting.ts` - Utilitarios: parseCurrencyBR, parseDateBR, cleanPatientName, formatCurrency, formatDate
- `src/lib/utils/formatting.test.ts` - Testes unitarios para utilitarios de formatacao
- `src/types/upload.types.ts` - Types para dados brutos da planilha, dados transformados, e payloads de upload
- `src/app/(admin)/upload/page.tsx` - Tela de upload com formulario multi-step, parse no browser, preview e confirmacao
- `src/components/upload/UploadForm.tsx` - Componente do formulario de upload (clinica, mes, tipo, arquivo)
- `src/components/upload/PreviewTable.tsx` - Componente de preview dos dados parseados com highlight de campos problematicos
- `src/components/upload/UploadProgress.tsx` - Indicador de progresso do upload (spinner/progress bar durante processamento)
- `src/components/upload/MonthlyUploadStatus.tsx` - Checklist de progresso mensal por clinica (2 tipos: uploadado/pendente)
- `src/app/api/upload/route.ts` - API Route POST para receber dados transformados, criar upload_batch e chamar webhook n8n
- `src/app/(admin)/upload/historico/page.tsx` - Tela de historico de uploads com filtros e indicadores visuais de status
- `src/components/upload/UploadHistoryTable.tsx` - Tabela de historico de uploads com colunas e filtros
- `src/components/upload/UploadDetailModal.tsx` - Modal de detalhe do upload mostrando registros importados e status de match
- `src/app/(admin)/upload/revisao/page.tsx` - Tela de revisao de match de procedimentos (procedimento_id = NULL)
- `src/components/upload/ProcedureMatchReview.tsx` - Componente de revisao: dropdown de match manual + botao criar novo procedimento
- `src/components/upload/CreateProcedureModal.tsx` - Modal de criacao rapida de procedimento (nome + custo)
- `src/components/shared/ClinicaSelect.tsx` - Dropdown reutilizavel de clinicas ativas (pode ja existir da Fase 1)
- `src/components/shared/MonthPicker.tsx` - Seletor de mes/ano reutilizavel
- `.env.local` - Adicionar N8N_WEBHOOK_URL e N8N_WEBHOOK_SECRET (server-side only)

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `xlsx-parser.ts` and `xlsx-parser.test.ts` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- O SheetJS (`xlsx`) deve ser instalado como dependencia do projeto: `npm install xlsx`.
- O parse da planilha e feito 100% no browser (sem upload do arquivo ao servidor). Somente o JSON transformado e enviado via API Route.
- Planilhas tipicas tem 50-200 linhas e <1MB — nao ha necessidade de chunking ou processamento em background.
- O tipo de planilha "Orcamentos" e unico mas separa automaticamente em `orcamentos_fechados` (status APPROVED) e `orcamentos_abertos` (demais status).
- Recebimentos NAO sao importados via planilha — serao registrados manualmente na Fase 4.
- A URL do webhook n8n (`N8N_WEBHOOK_URL`) sera definida quando os workflows forem criados. Configurar como variavel de ambiente server-side only.
- O design system `@beautysmile/design-system` fornece templates ListWithFilters (historico) e CRUD (upload) que devem ser utilizados.
- Types do Supabase em `src/types/database.types.ts` ja devem estar gerados da Fase 1 — reutilizar para tipagem das queries.

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Criar e fazer checkout de uma nova branch para esta feature (e.g., `git checkout -b feature/fase2-upload-processamento`)

- [x] 1.0 Implementar utilitarios de parse e transformacao de planilhas XLSX
  - [x] 1.1 Instalar dependencia SheetJS: `npm install xlsx`
  - [x] 1.2 Criar arquivo `src/types/upload.types.ts` com interfaces TypeScript para: dados brutos da planilha (RawOrcamentoRow, RawTratamentoRow), dados transformados (TransformedOrcamentoFechado, TransformedOrcamentoAberto, TransformedTratamento), e payload de upload (UploadPayload com clinica_id, mes_referencia, tipo, registros)
  - [x] 1.3 Criar `src/lib/utils/formatting.ts` com funcoes utilitarias:
    - `parseCurrencyBR(value: string): number` — converte "14.450,00" para 14450.00
    - `parseDateBR(value: string): string` — converte "DD/MM/YYYY" para "YYYY-MM-DD"
    - `cleanPatientName(name: string): string` — remove numero entre parenteses via regex `nome.replace(/\s*\(\d+\)\s*$/, '').trim()`
    - `detectIndication(comoConheceu: string): boolean` — retorna true se contem "Indicado por"
  - [x] 1.4 Criar `src/lib/utils/formatting.test.ts` com testes unitarios para todas as funcoes de formatting (incluindo edge cases: valores vazios, formatos inesperados, nomes sem parenteses)
  - [x] 1.5 Criar `src/lib/utils/xlsx-parser.ts` com funcoes:
    - `parseXLSXFile(file: File): Promise<any[][]>` — le arquivo XLSX no browser com SheetJS, extrai primeira aba, retorna array de arrays
    - `removeHeaderRow(data: any[][]): { headers: string[], rows: any[][] }` — separa header dos dados
    - `removeTotalizationRow(rows: any[][], headers: string[]): any[][]` — detecta e remove ultima linha se: coluna "Paciente" vazia OU colunas "Valor Total"/"Ticket Medio" preenchidas na ultima linha
    - `parseToObjects(headers: string[], rows: any[][]): Record<string, string>[]` — converte arrays para objetos chave-valor
  - [x] 1.6 Criar `src/lib/utils/xlsx-parser.test.ts` com testes unitarios para funcoes de parse (mock de dados simulando planilha Clinicorp com e sem linha totalizadora)
  - [x] 1.7 Criar `src/lib/utils/xlsx-transforms.ts` com funcoes de transformacao:
    - `transformOrcamentos(rows: Record<string, string>[], clinicaId: string, mesReferencia: string): { fechados: TransformedOrcamentoFechado[], abertos: TransformedOrcamentoAberto[] }` — implementar mapeamento Anexo C.1: separar por status APPROVED, limpar nome paciente, converter valores monetarios, parse datas, detectar indicacao, mapear todas as colunas
    - `transformTratamentos(rows: Record<string, string>[], clinicaId: string, mesReferencia: string): TransformedTratamento[]` — implementar mapeamento Anexo C.2: split coluna "Procedimento" por "+", `procedimento.split('+').map(p => p.trim()).filter(p => p.length > 0)`, cada parte gera registro independente, converter valores e datas
  - [x] 1.8 Criar `src/lib/utils/xlsx-transforms.test.ts` com testes unitarios para transformacoes (testar: split por "+", separacao fechados/abertos por status, limpeza de nome, conversao monetaria, deteccao de indicacao, registro com multiplos procedimentos)

- [x] 2.0 Implementar tela de Upload com formulario, preview e confirmacao
  - [x] 2.1 Criar componente `src/components/shared/ClinicaSelect.tsx` — dropdown de clinicas ativas buscando de `clinicas_parceiras` onde `ativa = true`, usando Supabase browser client (verificar se ja existe da Fase 1 e reutilizar)
  - [x] 2.2 Criar componente `src/components/shared/MonthPicker.tsx` — seletor de mes/ano que retorna o primeiro dia do mes selecionado (ex: "2026-03-01"), formato visual "Marco/2026"
  - [x] 2.3 Criar componente `src/components/upload/UploadForm.tsx` com os campos:
    - Clinica parceira (ClinicaSelect, obrigatorio)
    - Mes de referencia (MonthPicker, obrigatorio)
    - Tipo de planilha (dropdown: "Orcamentos", "Tratamentos Executados", obrigatorio)
    - Arquivo (input file, aceitar somente `.xlsx` e `.xls`)
    - Validacao: todos os campos obrigatorios preenchidos antes de habilitar parse
  - [x] 2.4 Implementar handler de selecao de arquivo no UploadForm: ao selecionar arquivo, chamar `parseXLSXFile` + `removeHeaderRow` + `removeTotalizationRow` + `parseToObjects`, e em seguida aplicar transformacao correspondente ao tipo selecionado (`transformOrcamentos` ou `transformTratamentos`). Armazenar resultado em state
  - [x] 2.5 Criar componente `src/components/upload/PreviewTable.tsx` que recebe os dados transformados e exibe:
    - Tabela com todas as colunas dos dados transformados
    - Contagem de registros no topo (ex: "42 registros encontrados")
    - Highlight em amarelo para campos problematicos: valores zerados (`valor_total === 0`), nomes vazios (`paciente_nome === ''`), datas invalidas
    - Para orcamentos: mostrar separacao "X fechados / Y abertos"
    - Para tratamentos: indicar registros que foram splitados por "+"
  - [x] 2.6 Implementar verificacao de duplicidade antes de confirmar:
    - Consultar `upload_batches` no Supabase filtrando por `clinica_id + mes_referencia + tipo` (para orcamentos, verificar tipo 'orcamentos_fechados' OU 'orcamentos_abertos')
    - Se existir registro: mostrar alerta "Ja existe upload de [tipo] para [clinica] em [mes]. Deseja substituir?"
    - Se usuario confirmar substituicao: armazenar flag para deletar batch antigo antes de processar
  - [x] 2.7 Criar componente `src/components/upload/UploadProgress.tsx` com estados visuais:
    - "Enviando dados..." (spinner durante chamada API)
    - "Processando..." (aguardando n8n)
    - "Concluido com sucesso!" (mensagem verde + contagem de registros)
    - "Erro no processamento" (mensagem vermelha + opcao de tentar novamente)
  - [x] 2.8 Criar pagina `src/app/(admin)/upload/page.tsx` compondo todos os componentes em fluxo multi-step:
    - Step 1: Formulario (UploadForm) — selecionar clinica, mes, tipo, arquivo
    - Step 2: Preview (PreviewTable) — visualizar dados transformados, botoes "Confirmar Upload" e "Cancelar"
    - Step 3: Processando (UploadProgress) — enviar dados via API route, mostrar progresso
    - Step 4: Concluido — mensagem de sucesso com link para historico
    - Implementar navegacao entre steps com estado controlado
  - [x] 2.9 Ao confirmar upload, enviar dados transformados para API route POST `/api/upload`: montar payload com `clinica_id`, `mes_referencia`, `tipo`, `registros` (array de dados transformados), e flag `substituir` se duplicidade confirmada. Tratar resposta de sucesso/erro e atualizar UI

- [x] 3.0 Implementar API Route e integracao com n8n para processamento server-side
  - [x] 3.1 Adicionar variaveis de ambiente em `.env.local`: `N8N_WEBHOOK_URL` (URL do webhook n8n, server-side only) e `N8N_WEBHOOK_SECRET` (secret compartilhado para autenticacao do webhook)
  - [x] 3.2 Criar API route `src/app/api/upload/route.ts` com handler POST que:
    - Valida autenticacao do usuario (Supabase server client, verificar se e admin)
    - Recebe payload JSON: `{ clinica_id, mes_referencia, tipo, registros, substituir }`
    - Se `substituir = true`: deletar registros antigos do batch anterior (buscar batch existente, deletar registros das tabelas correspondentes, deletar o batch)
    - Cria registro em `upload_batches` com status "processando", arquivo_nome, uploaded_by (user id)
    - Insere registros transformados nas tabelas correspondentes (`orcamentos_fechados`, `orcamentos_abertos`, ou `tratamentos_executados`) com `upload_batch_id`
    - Retorna `upload_batch_id` ao frontend
  - [x] 3.3 Na mesma API route, apos insercao dos registros, fazer chamada POST ao webhook n8n:
    - URL: `process.env.N8N_WEBHOOK_URL`
    - Headers: `{ 'Content-Type': 'application/json', 'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET }`
    - Body: `{ upload_batch_id, tipo }`
    - Se webhook falhar: manter status "processando" no batch (nao bloquear o frontend), logar erro
  - [x] 3.4 Criar workflow n8n "Upload Processing" (Workflow 1):
    - Trigger: Webhook POST recebendo `{ upload_batch_id, tipo }`
    - Validar header secret
    - Buscar registros do batch no Supabase
    - Validar campos obrigatorios: para orcamentos verificar `paciente_nome` e `valor_total`, para tratamentos verificar `paciente_nome` e `procedimento_nome`. Registros invalidos: logar e pular (nao bloquear batch)
  - [x] 3.5 No workflow n8n, implementar match de procedimentos (somente para tipo `tratamentos_executados`):
    - Para cada `procedimento_nome` do batch:
      a. Busca EXACT MATCH case-insensitive em `procedimentos.nome` → se encontrou, atualizar `procedimento_id = id`
      b. Se nao: busca ILIKE parcial (`%nome%`) → se encontrou exatamente 1 resultado, atualizar `procedimento_id = id`
      c. Se encontrou N>1 resultados ou nenhum: manter `procedimento_id = NULL` (marcado para revisao manual)
    - Armazenar campo auxiliar de status do match no registro (opcional: log no n8n)
  - [x] 3.6 No workflow n8n, apos processamento, atualizar `upload_batches`:
    - `status = 'concluido'` se sucesso, ou `status = 'erro'` se falhou
    - `total_registros` = quantidade de registros inseridos com sucesso
    - Preparar ponto de extensao (comentario/noop node) para notificacao Telegram futura
  - [x] 3.7 Implementar endpoint ou logica de polling no frontend para verificar status do batch apos envio: consultar `upload_batches` por id a cada 3 segundos ate status mudar de "processando" para "concluido" ou "erro", e atualizar UploadProgress correspondente

- [x] 4.0 Implementar tela de Historico de Uploads
  - [x] 4.1 Criar componente `src/components/upload/UploadHistoryTable.tsx` com tabela exibindo colunas:
    - Clinica (nome da clinica parceira via join)
    - Mes Referencia (formatado como "Marco/2026")
    - Tipo (Orcamentos Fechados / Orcamentos Abertos / Tratamentos Executados)
    - Arquivo (nome do arquivo original)
    - Total Registros
    - Status (com indicador visual: verde para concluido, amarelo para processando, vermelho para erro)
    - Uploaded por (nome do usuario via join com profiles)
    - Data (created_at formatado)
  - [x] 4.2 Implementar filtros no UploadHistoryTable:
    - Filtro por clinica (ClinicaSelect)
    - Filtro por mes de referencia (MonthPicker)
    - Filtro por tipo (dropdown)
    - Filtro por status (dropdown: todos, processando, concluido, erro)
    - Filtros aplicados via query params ou state, com consulta ao Supabase
  - [x] 4.3 Criar componente `src/components/upload/UploadDetailModal.tsx` — ao clicar em uma linha do historico, abrir modal/drawer mostrando:
    - Informacoes do batch (clinica, mes, tipo, data, usuario)
    - Tabela com registros importados naquele batch (consultar tabela correspondente ao tipo filtrando por `upload_batch_id`)
    - Para batches de tratamentos: coluna adicional indicando status do match de procedimento (matched com nome do procedimento, ou "Pendente revisao" em amarelo)
  - [x] 4.4 Criar pagina `src/app/(admin)/upload/historico/page.tsx` usando template ListWithFilters do design system, compondo UploadHistoryTable + UploadDetailModal. Ordenar por data decrescente (uploads mais recentes primeiro)

- [x] 5.0 Implementar tela de Revisao de Match de Procedimentos
  - [x] 5.1 Criar pagina `src/app/(admin)/upload/revisao/page.tsx` que consulta `tratamentos_executados` onde `procedimento_id IS NULL`, exibindo:
    - Nome do procedimento (da planilha — campo `procedimento_nome`)
    - Nome do paciente
    - Data de execucao
    - Clinica (via join)
    - Batch de origem (link para detalhe do upload)
  - [x] 5.2 Criar componente `src/components/upload/ProcedureMatchReview.tsx` com funcionalidade de match manual:
    - Dropdown para selecionar o procedimento correto da tabela `procedimentos` (buscar todos ativos)
    - Botao "Confirmar" que atualiza `procedimento_id` no registro de `tratamentos_executados`
    - Permitir selecao em bulk (checkbox para selecionar multiplos registros com mesmo `procedimento_nome` e aplicar match de uma vez)
  - [x] 5.3 Criar componente `src/components/upload/CreateProcedureModal.tsx` — modal de criacao rapida de procedimento:
    - Campos: nome (pre-preenchido com o `procedimento_nome` da planilha) e custo fixo
    - Ao salvar: inserir em `procedimentos`, e automaticamente fazer o match no registro que originou a criacao
  - [x] 5.4 Adicionar badge no menu lateral (Sidebar do layout admin) indicando quantidade de procedimentos pendentes de revisao:
    - Consultar `COUNT(*)` de `tratamentos_executados` onde `procedimento_id IS NULL`
    - Exibir badge numerico ao lado do item "Revisao" no menu (ex: "Revisao (5)")
    - Atualizar badge ao completar match

- [x] 6.0 Implementar indicador de progresso de upload mensal
  - [x] 6.1 Criar componente `src/components/upload/MonthlyUploadStatus.tsx` que para cada clinica ativa e mes selecionado:
    - Consulta `upload_batches` filtrando por `clinica_id + mes_referencia` com status "concluido"
    - Exibe checklist dos 2 tipos de planilha: "Orcamentos [ok/pendente]", "Tratamentos Executados [ok/pendente]"
    - Formato visual: "Clinica X - Marco/2026: Orcamentos [verde check], Tratamentos [cinza pendente]"
  - [x] 6.2 Adicionar badge visual "2/2 completo" com icone de sucesso quando ambos os uploads de uma clinica/mes estiverem com status "concluido"
  - [x] 6.3 Integrar MonthlyUploadStatus na tela de upload (`/(admin)/upload/page.tsx`), exibindo o painel de progresso abaixo ou ao lado do formulario de upload para que o admin veja rapidamente o que falta importar

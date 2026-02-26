# PRD Fase 2: Upload e Processamento de Planilhas

## 1. Introducao/Overview

Esta PRD cobre o **modulo de upload e processamento de planilhas** do Beauty Smile Partners Dashboard. E a funcionalidade central do sistema -- permite que a Beauty Smile importe os dados mensais exportados do Clinicorp (planilhas XLSX) para o banco de dados de forma estruturada, validada e rastreavel.

**Problema**: A Beauty Smile recebe planilhas mensais do Clinicorp com dados de orcamentos, tratamentos e recebimentos. Hoje esses dados sao processados manualmente em Excel. Erros sao frequentes e nao ha rastreabilidade.

**O que esta fase entrega**: Fluxo completo de upload -- desde a selecao do arquivo XLSX no browser, passando pelo preview dos dados, confirmacao pelo usuario, processamento automatico via n8n, ate a insercao nas tabelas definitivas do Supabase.

**Nota**: Recebimentos/pagamentos NAO sao importados via planilha -- serao registrados manualmente por paciente na Fase 4. Orcamentos abertos vem na mesma planilha de orcamentos, diferenciados pelo status. Notificacoes Telegram serao adicionadas em fase posterior.

**Pre-requisito**: Fase 1 concluida (Supabase com schema, Next.js com auth e CRUDs de configuracao).

---

## 2. Goals

1. Admin consegue fazer upload de planilha XLSX e visualizar os dados antes de confirmar
2. Sistema processa automaticamente os dados confirmados, transformando-os do formato Clinicorp para o schema do banco
3. Uma unica planilha de orcamentos separa automaticamente fechados (APPROVED) e abertos (demais status)
4. Duplicidade e detectada e tratada (nao permite reimportar mesmo tipo/mes/clinica sem aviso)
5. Procedimentos executados sao splitados por "+" e matched com a tabela de ~7 procedimentos pre-cadastrados (com fallback para revisao manual e opcao de cadastrar novos)
6. Historico de uploads e mantido para auditoria
7. Admin consegue visualizar o historico de uploads com status de cada um

---

## 3. User Stories

### US-10: Upload de Planilha
**Como** administrador,
**quero** fazer upload de uma planilha XLSX selecionando clinica, mes e tipo,
**para** importar os dados mensais do Clinicorp para o sistema.

### US-11: Preview antes de Confirmar
**Como** administrador,
**quero** visualizar os dados da planilha em uma tabela antes de confirmar o upload,
**para** verificar se os dados estao corretos e evitar importar informacoes erradas.

### US-12: Deteccao de Duplicidade
**Como** administrador,
**quero** ser avisado se ja existe um upload para a mesma clinica/mes/tipo,
**para** evitar duplicar dados no sistema por engano.

### US-13: Processamento Automatico
**Como** administrador,
**quero** que apos confirmar o upload, o sistema processe automaticamente os dados,
**para** nao precisar fazer transformacoes manuais.

### US-14: Match de Procedimentos
**Como** administrador,
**quero** que o sistema tente associar automaticamente procedimentos executados com a tabela de custos,
**para** que os custos sejam calculados corretamente no resumo mensal.

### US-15: Revisao de Procedimentos nao Matched
**Como** administrador,
**quero** visualizar procedimentos que nao foram associados automaticamente,
**para** poder fazer o match manual ou cadastrar novos procedimentos.

### US-16: Historico de Uploads
**Como** administrador,
**quero** ver o historico de todos os uploads realizados com status e detalhes,
**para** ter rastreabilidade e saber o que ja foi importado.

### ~~US-17: Notificacao de Conclusao~~ (movido para fase posterior)
Notificacoes Telegram serao implementadas em fase posterior quando o bot estiver configurado.

---

## 4. Functional Requirements

### 4.1 Tela de Upload (`/(admin)/upload/page.tsx`)

1. Formulario de upload com os seguintes campos:
   - **Clinica parceira** (dropdown de clinicas ativas, obrigatorio)
   - **Mes de referencia** (seletor de mes/ano, obrigatorio -- armazenar como primeiro dia do mes: 2026-03-01)
   - **Tipo de planilha** (dropdown: Orcamentos, Tratamentos Executados -- obrigatorio)
     - Nota: "Orcamentos" e uma unica planilha que contem fechados E abertos (separados por status "APPROVED")
     - Recebimentos NAO sao importados via planilha (serao registrados manualmente na Fase 4)
   - **Arquivo** (input file, aceitar somente .xlsx e .xls)
2. Ao selecionar o arquivo, o sistema faz **parse no browser** usando SheetJS (xlsx):
   - Ler o arquivo sem enviar ao servidor
   - Extrair os dados da primeira aba
   - Identificar e remover a ultima linha se for totalizadora (detectar se `Paciente` esta vazio ou se `Valor Total`/`Ticket Medio` estao preenchidos na ultima linha)
3. Exibir **tela de preview** com:
   - Tabela mostrando os dados parseados (todas as colunas da planilha)
   - Contagem de registros
   - Highlight em amarelo para campos que parecem problematicos (valores zerados, nomes vazios)
   - Botao "Confirmar Upload" e "Cancelar"
4. Antes de confirmar, **verificar duplicidade**:
   - Consultar `upload_batches` para `clinica_id + mes_referencia + tipo`
   - Se existir: mostrar alerta "Ja existe upload para [tipo] de [clinica] em [mes]. Deseja substituir?"
   - Se usuario confirmar substituicao: deletar dados antigos daquele batch antes de processar

### 4.2 Processamento no Frontend (Pre-envio)

5. **Transformacao dos dados antes de enviar** (conforme Anexo C do framework):

   **Para planilha de Orcamentos (tipo: orcamentos_fechados / orcamentos_abertos)**:
   - Coluna "Status" determina a tabela destino: "APPROVED" vai para `orcamentos_fechados`, qualquer outro status vai para `orcamentos_abertos`
   - Limpar nome do paciente: remover numero entre parenteses via regex `nome.replace(/\s*\(\d+\)\s*$/, '').trim()`
   - Converter valores monetarios formato BR ("14.450,00") para DECIMAL: `valor.replace(/\./g, '').replace(',', '.')`
   - Parse data "DD/MM/YYYY" para formato DATE (YYYY-MM-DD)
   - Detectar indicacao: se "Como conheceu?" contem "Indicado por" -> `tem_indicacao = true`
   - Mapear colunas conforme tabela do Anexo C.1 do framework

   **Para planilha de Procedimentos Executados (tipo: tratamentos_executados)**:
   - **Split por "+"**: coluna "Procedimento" que contem "+" gera multiplos registros
   - Cada parte apos split vira um registro independente em `tratamentos_executados`
   - Limpar espacos: `procedimento.split('+').map(p => p.trim()).filter(p => p.length > 0)`
   - Converter valores e datas igual aos orcamentos
   - Mapear colunas conforme tabela do Anexo C.2 do framework

6. **Enviar dados transformados para o Supabase** (tabela staging ou direto via API):
   - Criar registro em `upload_batches` com status "processando"
   - Enviar JSON dos dados transformados

7. **Trigger do n8n**: Apos insercao no staging, chamar webhook do n8n para iniciar processamento server-side

### 4.3 Processamento n8n (Workflow 1: Upload Processing)

8. **Trigger**: Webhook POST recebido do frontend com `upload_batch_id`
9. **Validacao de campos obrigatorios**:
   - Verificar que cada registro tem os campos minimos preenchidos (paciente_nome, valor_total para orcamentos; paciente_nome, procedimento_nome para tratamentos)
   - Registros invalidos: logar e pular (nao bloquear o batch inteiro)
10. **Match de procedimentos** (somente para tipo `tratamentos_executados`):
    - Para cada `procedimento_nome`:
      a. Busca EXACT MATCH em `procedimentos.nome` -> se encontrou, `procedimento_id = id`
      b. Se nao: busca ILIKE parcial (`%nome%`) -> se encontrou 1 resultado, `procedimento_id = id`
      c. Se encontrou N resultados ou nenhum: `procedimento_id = NULL` (marcado para revisao manual)
    - Armazenar resultado do match em campo auxiliar (matched/unmatched/ambiguous)
11. **Insercao nas tabelas definitivas**:
    - Inserir registros na tabela correspondente ao tipo (`orcamentos_fechados`, `orcamentos_abertos`, `tratamentos_executados`)
    - Todos os registros recebem o `upload_batch_id` para rastreabilidade
    - Orcamentos fechados: status inicial = 'em_aberto', valor_pago = 0
12. **Atualizacao do upload_batch**:
    - Status: "concluido" (se sucesso) ou "erro" (se falhou)
    - total_registros: quantidade de registros inseridos
13. **Notificacao Telegram**: (fase posterior -- bot ainda nao configurado)
    - Preparar hook/ponto de extensao no workflow para adicionar notificacao depois
    - Por enquanto, logar status no console do n8n

### 4.4 Tela de Historico de Uploads (`/(admin)/upload/historico/page.tsx`)

14. Tabela de uploads realizados com colunas:
    - Clinica, Mes Referencia, Tipo, Arquivo, Total Registros, Status, Uploaded por, Data
15. Filtros: por clinica, por mes, por tipo, por status
16. Indicador visual de status: verde (concluido), amarelo (processando), vermelho (erro)
17. Ao clicar em um upload, mostrar detalhes:
    - Registros importados naquele batch
    - Se tratamentos: mostrar quais procedimentos foram matched e quais nao

### 4.5 Tela de Revisao de Match de Procedimentos

18. Tela ou secao que lista procedimentos importados com `procedimento_id = NULL`:
    - Mostrar: nome do procedimento (da planilha), paciente, data
    - Dropdown para selecionar o procedimento correto da tabela `procedimentos`
    - Botao "Criar Novo Procedimento" que abre modal de criacao rapida (nome + custo)
    - Ao confirmar match: atualiza `procedimento_id` no registro
19. Badge no menu lateral indicando quantidade de procedimentos pendentes de revisao

### 4.6 Indicador de Progresso de Upload Mensal

20. Na tela de upload, mostrar para cada clinica/mes:
    - Checklist dos 2 tipos de planilha com status (uploadado/pendente)
    - Ex: "Clinica X - Marco/2026: Orcamentos [ok], Tratamentos Executados [pendente]"
21. Quando os 2 uploads de uma clinica/mes estiverem concluidos, o calculo do resumo mensal sera disparado automaticamente (implementado na Fase 3). Nesta fase, exibir apenas o indicador visual "2/2 completo" com badge de sucesso

---

## 5. Non-Goals (Out of Scope)

- **Calculo do resumo mensal** -- sera coberto na Fase 3
- **Edicao de dados apos importacao** -- dados importados sao imutaveis nesta fase (para corrigir, deletar batch e reimportar)
- **Importacao de recebimentos/pagamentos via planilha** -- recebimentos serao registrados manualmente por paciente na Fase 4 (valor, forma de pagamento, data, parcelas se cartao)
- **Notificacoes Telegram** -- bot ainda nao configurado, sera adicionado em fase posterior
- **Auto-deteccao do tipo de planilha** -- o usuario deve selecionar manualmente o tipo
- **Drag and drop de multiplos arquivos** -- um upload por vez

---

## 6. Design Considerations

### Fluxo Visual do Upload:
```
[1. Selecionar]  →  [2. Preview]  →  [3. Confirmar]  →  [4. Processando]  →  [5. Concluido]
   clinica            tabela com         botao              spinner/              mensagem
   mes                dados              confirmar          progress bar          de sucesso
   tipo               parseados
   arquivo
```

### Templates do Design System:
- **ListWithFilters** -- Historico de uploads, lista de procedimentos pendentes
- **CRUD** -- Tela de upload (formulario + preview)

### UX Importante:
- Preview deve mostrar os dados JA transformados (nomes limpos, valores convertidos) para o admin validar o resultado final
- Indicadores visuais claros de status (icones + cores)
- Feedback imediato durante o parse do arquivo (loading state)

---

## 7. Technical Considerations

### Dependencias adicionais:
- `xlsx` (SheetJS) -- parse de XLSX no browser
- n8n configurado com webhook endpoint

### Parse no Browser vs Servidor:
- Parse inicial e feito 100% no browser com SheetJS (melhor UX, sem upload desnecessario)
- Dados transformados sao enviados como JSON (nao o arquivo XLSX)
- n8n faz validacao e insercao final (garante robustez)

### Tamanho dos Arquivos:
- Planilhas tipicas: 50-200 linhas, <1MB
- Nao ha necessidade de chunking ou processamento em background no browser

### Webhook n8n:
- URL: configurar como variavel de ambiente `N8N_WEBHOOK_URL` (server-side only)
- URL sera definida quando os workflows n8n forem criados (fase posterior ao setup do upload)
- Autenticacao do webhook: usar header secret compartilhado para evitar chamadas nao autorizadas
- Timeout: configurar retry em caso de falha (n8n tem retry nativo)

### Match de Procedimentos (estrategia com ~7 procedimentos):
- Com apenas 7 procedimentos na tabela, a estrategia de match sera:
  1. EXACT MATCH (case-insensitive) em `procedimentos.nome`
  2. ILIKE com match pelo inicio do nome: `procedimento_nome ILIKE procedimentos.nome || '%'`
  3. Se nenhum match: `procedimento_id = NULL`, marcado para revisao manual
- Nao e necessario Levenshtein distance com tao poucos procedimentos
- Conforme novos procedimentos forem surgindo, o admin cadastra via CRUD ou pelo botao "Criar Novo" na tela de revisao

### Tratamento de Erros:
- Se parse falhar: mostrar erro amigavel ("Arquivo invalido ou formato nao reconhecido")
- Se webhook falhar: manter status "processando" no upload_batch e mostrar opcao de "Reprocessar"
- Se insercao falhar parcialmente: logar quais registros falharam, marcar batch como "erro"

---

## 8. Success Metrics

1. **Upload end-to-end funcional**: Admin consegue fazer upload de planilha de orcamentos fechados e ver os dados inseridos no banco
2. **Preview correto**: Dados no preview refletem as transformacoes (nomes limpos, valores convertidos, linha totalizadora removida)
3. **Split de procedimentos**: Planilha de tratamentos com "+" gera registros separados corretamente
4. **Match de procedimentos**: Pelo menos 70% dos procedimentos sao matched automaticamente (considerando tabela de procedimentos pre-cadastrada)
5. **Duplicidade detectada**: Tentar reimportar mesmo tipo/mes/clinica mostra alerta
6. **Historico rastreavel**: Todos os uploads aparecem no historico com status correto

---

## 9. Open Questions

Todas as questoes iniciais foram respondidas:

| # | Questao | Resposta |
|---|---------|----------|
| 1 | Planilha de Recebimentos? | Nao havera import via planilha. Recebimentos serao registrados manualmente por paciente (valor, forma, data, parcelas) na Fase 4 |
| 2 | Orcamentos Abertos separados? | Nao, vem na mesma planilha de orcamentos, diferenciados pelo status (APPROVED = fechado, demais = aberto) |
| 3 | n8n Webhook URL? | Sera definida quando os workflows forem criados. Configurar como variavel de ambiente |
| 4 | Telegram Bot? | Ainda nao configurado. Notificacoes Telegram ficam para fase posterior |
| 5 | Procedimentos iniciais? | ~7 procedimentos pre-cadastrados. Lista pronta, com opcao de cadastrar novos manualmente |
| 6 | Fuzzy matching? | Exact match (case-insensitive) + ILIKE pelo inicio do nome. Sem Levenshtein (desnecessario com 7 procedimentos) |

**Sem questoes pendentes para esta fase.**

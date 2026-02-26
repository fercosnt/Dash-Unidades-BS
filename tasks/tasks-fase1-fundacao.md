## Relevant Files

- `supabase/migrations/001_initial_schema.sql` - Schema SQL completo (enums, tabelas de configuracao, perfis, controle, dados brutos, pagamentos, resumo, views, indexes, triggers, functions)
- `supabase/migrations/002_rls_policies.sql` - Row Level Security policies para todas as tabelas
- `supabase/migrations/003_additional_columns.sql` - Campos adicionais mapeados no Anexo C (orcamentos_fechados, tratamentos_executados)
- `supabase/seed.sql` - Dados iniciais de teste (admin, parceiro, clinica, procedimentos, medico, config financeira)
- `src/types/database.types.ts` - Types gerados do Supabase com `supabase gen types typescript`
- `src/lib/supabase/client.ts` - Supabase browser client (createBrowserClient)
- `src/lib/supabase/server.ts` - Supabase server client (createServerClient)
- `src/lib/supabase/middleware.ts` - Supabase middleware helper para renovar sessao
- `src/middleware.ts` - Next.js middleware para protecao de rotas e redirecionamento por role
- `src/app/(auth)/login/page.tsx` - Tela de login usando template LoginAdmin do design system
- `src/app/(admin)/layout.tsx` - Layout admin com sidebar, header e navegacao
- `src/app/(admin)/dashboard/page.tsx` - Dashboard admin placeholder
- `src/app/(parceiro)/layout.tsx` - Layout parceiro com sidebar simplificada
- `src/app/(parceiro)/dashboard/page.tsx` - Dashboard parceiro placeholder
- `src/app/(admin)/configuracoes/clinicas/page.tsx` - CRUD listagem de clinicas parceiras
- `src/app/(admin)/configuracoes/clinicas/[id]/page.tsx` - CRUD edicao de clinica parceira (ou modal)
- `src/app/(admin)/configuracoes/procedimentos/page.tsx` - CRUD listagem de procedimentos
- `src/app/(admin)/configuracoes/procedimentos/[id]/page.tsx` - CRUD edicao de procedimento (ou modal)
- `src/app/(admin)/configuracoes/medicos/page.tsx` - CRUD listagem de medicos indicadores
- `src/app/(admin)/configuracoes/medicos/[id]/page.tsx` - CRUD edicao de medico indicador (ou modal)
- `src/app/(admin)/configuracoes/financeiro/page.tsx` - Tela de parametros financeiros com historico
- `src/components/shared/Sidebar.tsx` - Componente de sidebar reutilizavel (admin e parceiro)
- `src/components/shared/Header.tsx` - Componente de header reutilizavel
- `.env.local` - Variaveis de ambiente (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- `next.config.js` - Configuracao do Next.js
- `package.json` - Dependencias do projeto (next, @supabase/supabase-js, @supabase/ssr, @beautysmile/design-system, typescript)
- `tsconfig.json` - Configuracao TypeScript

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- O design system `@beautysmile/design-system` e um pacote publico no GitHub — instalar via GitHub URL.
- O Supabase client deve usar `@supabase/ssr` para criar clients adequados ao contexto (browser, server, middleware).
- Types do Supabase devem ser gerados com `supabase gen types typescript` e mantidos em `src/types/database.types.ts`.
- Admin Theme: Deep Blue (#0A2463) — seguir padroes do design system.
- Parceiro pode usar glass morphism do design system para diferenciacao visual.
- Regiao Supabase: South America - Sao Paulo (sa-east-1).
- Contas de parceiros sao criadas manualmente pelo admin (sem self-service).

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Create and checkout a new branch for this feature (e.g., `git checkout -b feature/fase1-fundacao`)

- [ ] 1.0 Setup Supabase — Criar projeto e executar schema SQL completo
  - [ ] 1.1 Criar projeto no Supabase (free tier, regiao sa-east-1 South America - Sao Paulo)
  - [ ] 1.2 Criar arquivo de migracao `supabase/migrations/001_initial_schema.sql` com todos os enums: `tipo_planilha`, `status_upload`, `status_orcamento`, `forma_pagamento`, `status_parcela`, `status_resumo`
  - [ ] 1.3 Adicionar na migracao as tabelas de configuracao: `clinicas_parceiras` (nome, cnpj, responsavel, email, telefone, custo_mao_de_obra, percentual_split default 40, ativa), `procedimentos` (nome, codigo_clinicorp, custo_fixo, categoria, ativo), `configuracoes_financeiras` (taxa_cartao_percentual, imposto_nf_percentual, percentual_beauty_smile default 60, vigencia_inicio, vigencia_fim)
  - [ ] 1.4 Adicionar tabela `profiles` como extensao do Supabase Auth (id references auth.users, role text 'admin'|'parceiro', clinica_id references clinicas_parceiras, nome, email, created_at, updated_at)
  - [ ] 1.5 Adicionar tabela `medicos_indicadores` (nome, clinica_id, percentual_comissao default 10, ativo, created_at, updated_at)
  - [ ] 1.6 Adicionar tabela de controle `upload_batches` (clinica_id, mes_referencia, tipo_planilha, status_upload, arquivo_nome, registros_total, registros_processados, erro_mensagem, uploaded_by, created_at, updated_at)
  - [ ] 1.7 Adicionar tabelas de dados brutos: `orcamentos_fechados` (com campos do framework + campos adicionais do Anexo C: profissional, paciente_telefone, procedimentos_texto, valor_bruto, desconto_percentual, desconto_reais, observacoes, tem_indicacao), `orcamentos_abertos`, `tratamentos_executados` (com campos adicionais: profissional, regiao, valor)
  - [ ] 1.8 Adicionar tabelas de pagamentos: `pagamentos` (orcamento_id, valor, forma_pagamento, data_pagamento, observacoes), `parcelas_cartao` (pagamento_id, numero_parcela, valor_parcela, data_prevista, data_recebimento, status_parcela)
  - [ ] 1.9 Adicionar tabela calculada `resumo_mensal` (clinica_id, mes_referencia, total_faturado, total_custos, total_comissoes, taxa_cartao, imposto_nf, percentual_beauty_smile, valor_beauty_smile, valor_clinica, status_resumo, created_at, updated_at)
  - [ ] 1.10 Adicionar views: `vw_inadimplentes` (orcamentos com pagamento pendente/atrasado), `vw_recebimentos_futuros` (parcelas de cartao futuras com datas previstas)
  - [ ] 1.11 Criar todos os indexes definidos no framework (secao 9) — indexes em clinica_id, mes_referencia, status, e campos de busca frequente
  - [ ] 1.12 Criar trigger `update_updated_at` — trigger generico que atualiza o campo updated_at automaticamente em qualquer tabela que o utilize
  - [ ] 1.13 Criar trigger `update_orcamento_status` — atualiza status do orcamento quando pagamento e registrado
  - [ ] 1.14 Criar function `auth_clinica_id()` — retorna o clinica_id do usuario autenticado a partir da tabela profiles
  - [ ] 1.15 Criar function `is_admin()` — retorna true se o usuario autenticado tem role = 'admin' na tabela profiles
  - [ ] 1.16 Executar a migracao no Supabase e verificar que todas as tabelas, views, triggers, functions e indexes foram criados corretamente

- [ ] 2.0 Setup Row Level Security (RLS) — Ativar RLS e criar policies para todas as tabelas
  - [ ] 2.1 Criar arquivo `supabase/migrations/002_rls_policies.sql`
  - [ ] 2.2 Ativar RLS em todas as tabelas com `clinica_id`: `orcamentos_fechados`, `orcamentos_abertos`, `tratamentos_executados`, `pagamentos`, `parcelas_cartao`, `resumo_mensal`, `upload_batches`, `medicos_indicadores`
  - [ ] 2.3 Criar policy `admin_full_access` (FOR ALL USING (is_admin())) em cada tabela com clinica_id
  - [ ] 2.4 Criar policy `parceiro_read_own` (FOR SELECT USING (clinica_id = auth_clinica_id())) em cada tabela com clinica_id
  - [ ] 2.5 Ativar RLS na tabela `profiles` — admin ve todos os profiles, parceiro ve somente seu proprio profile (id = auth.uid())
  - [ ] 2.6 Ativar RLS nas tabelas `clinicas_parceiras`, `procedimentos` e `configuracoes_financeiras` — admin: acesso total (CRUD), parceiro: somente leitura (SELECT)
  - [ ] 2.7 Executar a migracao de RLS no Supabase e verificar que todas as policies foram criadas

- [ ] 3.0 Setup Next.js — Criar projeto Next.js 14+ com App Router, TypeScript, design system e configuracao Supabase client
  - [ ] 3.1 Criar projeto Next.js 14+ com App Router e TypeScript (`npx create-next-app@latest --typescript --app`)
  - [ ] 3.2 Instalar dependencias: `@supabase/supabase-js`, `@supabase/ssr`
  - [ ] 3.3 Instalar `@beautysmile/design-system` via GitHub URL e configurar o Admin Theme (Deep Blue #0A2463)
  - [ ] 3.4 Criar arquivo `.env.local` com as variaveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] 3.5 Criar `src/lib/supabase/client.ts` — browser client usando `createBrowserClient` do `@supabase/ssr`
  - [ ] 3.6 Criar `src/lib/supabase/server.ts` — server client usando `createServerClient` do `@supabase/ssr` para Server Components e API Routes
  - [ ] 3.7 Criar `src/lib/supabase/middleware.ts` — helper para renovar sessao automaticamente no middleware
  - [ ] 3.8 Gerar types do Supabase com `supabase gen types typescript` e salvar em `src/types/database.types.ts`
  - [ ] 3.9 Criar estrutura de pastas conforme Anexo D do framework: `src/app/(auth)/login/`, `src/app/(admin)/dashboard/`, `src/app/(admin)/configuracoes/clinicas/`, `src/app/(admin)/configuracoes/procedimentos/`, `src/app/(admin)/configuracoes/medicos/`, `src/app/(admin)/configuracoes/financeiro/`, `src/app/(parceiro)/dashboard/`, `src/app/api/`, `src/components/shared/`, `src/lib/supabase/`, `src/lib/utils/`, `src/types/`
  - [ ] 3.10 Verificar que o projeto compila e roda sem erros (`npm run dev`)

- [ ] 4.0 Implementar autenticacao e protecao de rotas — Login, middleware, redirecionamento por role, logout
  - [ ] 4.1 Criar tela de login em `src/app/(auth)/login/page.tsx` usando o template `LoginAdmin` do design system — campos de email e senha, botao de login, sem opcao de cadastro
  - [ ] 4.2 Implementar logica de autenticacao no login: chamar `supabase.auth.signInWithPassword`, exibir mensagens de erro claras (credenciais invalidas, conta desativada)
  - [ ] 4.3 Apos login bem-sucedido, buscar o role do usuario na tabela `profiles` e redirecionar: admin → `/(admin)/dashboard`, parceiro → `/(parceiro)/dashboard`
  - [ ] 4.4 Criar `src/middleware.ts` para protecao de rotas: rota `/login` acessivel sem autenticacao; rotas `/(admin)/*` requerem auth + role = 'admin'; rotas `/(parceiro)/*` requerem auth + role = 'parceiro'; redirecionar para `/login` se nao autenticado; redirecionar para painel correto se usuario tenta acessar rota do outro role
  - [ ] 4.5 Implementar funcionalidade de logout: botao visivel no header, limpar sessao Supabase (`supabase.auth.signOut`), redirecionar para `/login`
  - [ ] 4.6 Criar pagina placeholder `src/app/(admin)/dashboard/page.tsx` com texto "Dashboard Admin - Em construcao"
  - [ ] 4.7 Criar pagina placeholder `src/app/(parceiro)/dashboard/page.tsx` com texto "Dashboard Parceiro - Em construcao"
  - [ ] 4.8 Testar fluxo completo: login como admin redireciona para dashboard admin, login como parceiro redireciona para dashboard parceiro, acesso sem autenticacao redireciona para login

- [ ] 5.0 Criar layouts base — Layout admin (sidebar com navegacao completa, header) e layout parceiro (sidebar simplificada)
  - [ ] 5.1 Criar `src/app/(admin)/layout.tsx` com sidebar fixa a esquerda contendo icones + texto com os menu items: Dashboard, Upload, Clinicas, Financeiro, Inadimplencia, Pagamentos, Configuracoes
  - [ ] 5.2 Adicionar sub-items no menu Configuracoes do admin: Clinicas, Procedimentos, Medicos, Financeiro
  - [ ] 5.3 Adicionar header fixo no topo do layout admin com nome do usuario logado (buscado de profiles) e botao de logout
  - [ ] 5.4 Implementar area de conteudo principal no layout admin onde as paginas filhas serao renderizadas
  - [ ] 5.5 Criar `src/app/(parceiro)/layout.tsx` com sidebar simplificada contendo apenas: Dashboard, Orcamentos, Financeiro, Inadimplencia
  - [ ] 5.6 Adicionar header fixo no topo do layout parceiro com nome da clinica (buscado de clinicas_parceiras via clinica_id do profile) e botao de logout
  - [ ] 5.7 Aplicar diferenciacao visual no layout parceiro (glass morphism do design system)
  - [ ] 5.8 Verificar que ambos layouts renderizam corretamente e a navegacao entre paginas funciona

- [ ] 6.0 CRUD Clinicas Parceiras — Listagem com filtro, criacao, edicao e ativacao/desativacao
  - [ ] 6.1 Criar tela de listagem em `src/app/(admin)/configuracoes/clinicas/page.tsx` com tabela contendo colunas: Nome, CNPJ, Responsavel, Custo Mao de Obra (R$), Split (%), Status (Ativa/Inativa)
  - [ ] 6.2 Implementar filtro por status na listagem (ativa/inativa/todas)
  - [ ] 6.3 Adicionar botao "Nova Clinica" que abre formulario/modal de criacao
  - [ ] 6.4 Criar formulario/modal de criacao e edicao com campos: nome (obrigatorio), cnpj (unico, formato valido), responsavel, email, telefone, custo_mao_de_obra (R$, >= 0), percentual_split (%, default 40, entre 0 e 100)
  - [ ] 6.5 Implementar validacoes no formulario: nome obrigatorio, cnpj formato valido e unico, custo >= 0, split entre 0 e 100
  - [ ] 6.6 Implementar funcionalidade de ativar/desativar clinica (toggle na listagem ou botao no formulario)
  - [ ] 6.7 Implementar queries Supabase para operacoes CRUD (insert, update, select) usando server actions ou API routes
  - [ ] 6.8 Testar criacao, edicao, listagem e ativacao/desativacao de clinicas

- [ ] 7.0 CRUD Procedimentos — Listagem com filtro, criacao, edicao e ativacao/desativacao
  - [ ] 7.1 Criar tela de listagem em `src/app/(admin)/configuracoes/procedimentos/page.tsx` com tabela contendo colunas: Nome, Codigo Clinicorp, Custo Fixo (R$), Categoria, Status (Ativo/Inativo)
  - [ ] 7.2 Implementar filtros por categoria e status na listagem
  - [ ] 7.3 Adicionar botao "Novo Procedimento" que abre formulario/modal de criacao
  - [ ] 7.4 Criar formulario/modal de criacao e edicao com campos: nome (obrigatorio), codigo_clinicorp, custo_fixo (R$, obrigatorio, >= 0), categoria, ativo (toggle)
  - [ ] 7.5 Implementar validacoes no formulario: nome obrigatorio, custo_fixo >= 0
  - [ ] 7.6 Implementar queries Supabase para operacoes CRUD (insert, update, select) usando server actions ou API routes
  - [ ] 7.7 Testar criacao, edicao, listagem e filtros de procedimentos

- [ ] 8.0 CRUD Medicos Indicadores — Listagem com filtro por clinica, criacao, edicao e ativacao/desativacao
  - [ ] 8.1 Criar tela de listagem em `src/app/(admin)/configuracoes/medicos/page.tsx` com tabela contendo colunas: Nome, Clinica Vinculada, Comissao (%), Status (Ativo/Inativo)
  - [ ] 8.2 Implementar filtro por clinica na listagem (dropdown com clinicas ativas)
  - [ ] 8.3 Adicionar botao "Novo Medico" que abre formulario/modal de criacao
  - [ ] 8.4 Criar formulario/modal de criacao e edicao com campos: nome (obrigatorio), clinica_id (dropdown de clinicas ativas, obrigatorio), percentual_comissao (%, default 10, entre 0 e 100), ativo (toggle)
  - [ ] 8.5 Implementar validacoes no formulario: nome obrigatorio, clinica obrigatoria, comissao entre 0 e 100
  - [ ] 8.6 Implementar queries Supabase para operacoes CRUD (insert, update, select com join em clinicas_parceiras para exibir nome da clinica)
  - [ ] 8.7 Testar criacao, edicao, listagem e filtro por clinica de medicos

- [ ] 9.0 Configuracoes Financeiras — Tela de parametros vigentes com historico de configuracoes anteriores
  - [ ] 9.1 Criar tela de parametros em `src/app/(admin)/configuracoes/financeiro/page.tsx` com campos editaveis: taxa_cartao_percentual (%), imposto_nf_percentual (%), percentual_beauty_smile (%, default 60)
  - [ ] 9.2 Exibir vigencia atual (vigencia_inicio) da configuracao vigente (registro com vigencia_fim = NULL)
  - [ ] 9.3 Implementar logica de salvamento: ao salvar, criar novo registro com vigencia_inicio = hoje e atualizar registro anterior com vigencia_fim = ontem
  - [ ] 9.4 Implementar tabela de historico abaixo dos campos editaveis mostrando configuracoes anteriores (taxa_cartao, imposto_nf, percentual_beauty_smile, vigencia_inicio, vigencia_fim)
  - [ ] 9.5 Implementar queries Supabase: buscar configuracao vigente (vigencia_fim IS NULL), listar historico (ORDER BY vigencia_inicio DESC), salvar nova configuracao com logica de fechamento de vigencia
  - [ ] 9.6 Testar criacao de nova configuracao, verificar que vigencia anterior foi fechada e historico exibe corretamente

- [ ] 10.0 Criar usuarios e dados de teste — Admin, parceiro, clinica, procedimentos, medico e configuracao financeira
  - [ ] 10.1 Criar usuario admin no Supabase Auth (email + senha) e inserir registro correspondente em `profiles` com role = 'admin'
  - [ ] 10.2 Criar 1 clinica parceira de teste via CRUD do sistema (com dados completos: nome, cnpj, responsavel, custo_mao_de_obra, percentual_split)
  - [ ] 10.3 Criar usuario parceiro no Supabase Auth (email + senha) e inserir registro em `profiles` com role = 'parceiro' e clinica_id da clinica criada
  - [ ] 10.4 Cadastrar pelo menos 5 procedimentos de teste via CRUD do sistema (com nomes, custos fixos e categorias variadas)
  - [ ] 10.5 Cadastrar pelo menos 1 medico indicador de teste vinculado a clinica criada via CRUD do sistema
  - [ ] 10.6 Criar 1 configuracao financeira vigente via tela de parametros (taxa_cartao, imposto_nf, percentual_beauty_smile)
  - [ ] 10.7 Opcionalmente, criar arquivo `supabase/seed.sql` com os dados de teste para facilitar reset do ambiente
  - [ ] 10.8 Validar RLS: logar como parceiro e verificar que so ve dados da sua clinica; tentar acessar rotas admin e verificar que e bloqueado
  - [ ] 10.9 Documentar processo de criacao de usuario: passo a passo de como criar usuario no Supabase Auth e inserir registro em profiles com role e clinica_id

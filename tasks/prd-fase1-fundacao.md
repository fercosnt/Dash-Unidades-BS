# PRD Fase 1: Fundacao e Configuracoes

## 1. Introducao/Overview

O Beauty Smile Partners Dashboard e um sistema web para gestao financeira das clinicas parceiras da Beauty Smile. Esta PRD cobre a **Fase 1 (Fundacao)** -- o setup inicial de toda a infraestrutura, autenticacao, layout base e telas de configuracao (CRUDs).

**Problema**: Hoje o fechamento mensal e manual, com multiplas planilhas, calculos em Excel e envio por email. Nao existe um sistema centralizado nem acesso restrito por clinica.

**O que esta fase entrega**: A base tecnica completa sobre a qual todas as funcionalidades futuras serao construidas -- banco de dados, autenticacao, multi-tenancy, layout da aplicacao e telas de cadastro de dados mestres (clinicas, procedimentos, medicos, parametros financeiros).

**Por que comecar por aqui**: Sem esta fundacao, nenhum upload, calculo ou dashboard funciona. Esta fase garante que o banco esta pronto, os usuarios conseguem logar, e os dados de referencia estao cadastrados.

---

## 2. Goals

1. Ter o projeto Supabase criado com o schema SQL completo executado e funcional
2. Ter o projeto Next.js 14 (App Router) configurado com o `@beautysmile/design-system` (Admin Theme)
3. Ter autenticacao funcional com login por email + senha via Supabase Auth
4. Ter Row Level Security (RLS) configurado e testado -- parceiro so ve seus dados
5. Ter layout base da aplicacao (sidebar, header, rotas protegidas)
6. Ter CRUDs funcionais para: Clinicas Parceiras, Procedimentos, Medicos Indicadores, Configuracoes Financeiras
7. Ter pelo menos 1 usuario admin e 1 usuario parceiro de teste criados

---

## 3. User Stories

### US-01: Login Admin
**Como** administrador da Beauty Smile,
**quero** fazer login com email e senha,
**para** acessar o painel administrativo com visao completa do sistema.

### US-02: Login Parceiro
**Como** responsavel por uma clinica parceira,
**quero** fazer login com email e senha,
**para** acessar o painel da minha clinica com meus dados (somente leitura).

### US-03: Redirecionamento por Role
**Como** usuario logado,
**quero** ser redirecionado automaticamente para o painel correto (admin ou parceiro),
**para** ter uma experiencia fluida sem precisar escolher manualmente.

### US-04: Gerenciar Clinicas Parceiras
**Como** administrador,
**quero** cadastrar, editar, ativar/desativar clinicas parceiras,
**para** manter o registro atualizado das clinicas que operam com a Beauty Smile.

### US-05: Gerenciar Procedimentos
**Como** administrador,
**quero** cadastrar e editar procedimentos com seus custos fixos,
**para** que o sistema consiga calcular custos automaticamente quando os tratamentos forem importados.

### US-06: Gerenciar Medicos Indicadores
**Como** administrador,
**quero** cadastrar medicos indicadores vinculados a uma clinica,
**para** que o sistema calcule comissoes quando um orcamento tiver indicacao medica.

### US-07: Configurar Parametros Financeiros
**Como** administrador,
**quero** definir taxa de cartao (%), imposto NF (%) e percentual Beauty Smile/Clinica,
**para** que os calculos do resumo mensal usem os parametros corretos.

### US-08: Protecao de Rotas
**Como** sistema,
**quero** impedir que usuarios nao autenticados acessem qualquer pagina,
**para** garantir a seguranca dos dados financeiros.

### US-09: Isolamento de Dados (Multi-tenancy)
**Como** sistema,
**quero** garantir que um parceiro nunca veja dados de outra clinica, mesmo se manipular a URL ou a API,
**para** proteger informacoes financeiras sensiveis.

---

## 4. Functional Requirements

### 4.1 Setup Supabase

1. Criar projeto no Supabase (free tier)
2. Executar o schema SQL completo conforme definido no framework (secao 3.2), incluindo:
   - Tabelas de configuracao: `clinicas_parceiras`, `procedimentos`, `medicos_indicadores`, `configuracoes_financeiras`
   - Tabela de perfis: `profiles` (extensao do Supabase Auth)
   - Tabelas de controle: `upload_batches`
   - Tabelas de dados brutos: `orcamentos_fechados`, `orcamentos_abertos`, `tratamentos_executados`
   - Tabelas de pagamentos: `pagamentos`, `parcelas_cartao`
   - Tabela calculada: `resumo_mensal`
   - Views: `vw_inadimplentes`, `vw_recebimentos_futuros`
   - Enums: `tipo_planilha`, `status_upload`, `status_orcamento`, `forma_pagamento`, `status_parcela`, `status_resumo`
3. Executar os campos adicionais mapeados no Anexo C do framework:
   - `orcamentos_fechados`: adicionar `profissional`, `paciente_telefone`, `procedimentos_texto`, `valor_bruto`, `desconto_percentual`, `desconto_reais`, `observacoes`, `tem_indicacao`
   - `tratamentos_executados`: adicionar `profissional`, `regiao`, `valor`
4. Criar todos os indexes definidos no framework (secao 9)
5. Criar triggers: `update_updated_at`, `update_orcamento_status`
6. Criar functions auxiliares: `auth_clinica_id()`, `is_admin()`

### 4.2 Row Level Security (RLS)

7. Ativar RLS em todas as tabelas com `clinica_id`: `orcamentos_fechados`, `orcamentos_abertos`, `tratamentos_executados`, `pagamentos`, `parcelas_cartao`, `resumo_mensal`, `upload_batches`, `medicos_indicadores`
8. Criar policy `admin_full_access` (FOR ALL USING is_admin()) em cada tabela
9. Criar policy `parceiro_read_own` (FOR SELECT USING clinica_id = auth_clinica_id()) em cada tabela
10. Adicionar RLS na tabela `profiles`:
    - Admin ve todos os profiles
    - Parceiro ve somente seu proprio profile
11. Tabelas `clinicas_parceiras`, `procedimentos` e `configuracoes_financeiras`:
    - Admin: acesso total (CRUD)
    - Parceiro: somente leitura (SELECT) -- parceiro pode ver lista de procedimentos e dados da sua clinica

### 4.3 Setup Next.js

12. Criar projeto Next.js 14+ com App Router e TypeScript
13. Instalar e configurar `@beautysmile/design-system` com o Admin Theme (Deep Blue #0A2463)
14. Configurar Supabase client:
    - Client-side: `createBrowserClient` para componentes client
    - Server-side: `createServerClient` para Server Components e API Routes
    - Middleware: para verificar sessao em rotas protegidas
15. Configurar variaveis de ambiente:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY` (somente server-side, para operacoes admin)

### 4.4 Autenticacao e Rotas

16. Tela de Login usando template `LoginAdmin` do design system:
    - Campos: email e senha
    - Botao de login
    - Mensagens de erro claras (credenciais invalidas, conta desativada)
    - Sem opcao de cadastro (contas sao criadas pelo admin)
17. Middleware Next.js para protecao de rotas:
    - Rota `/login` -- acessivel sem autenticacao
    - Rotas `/(admin)/*` -- requer autenticacao + role = 'admin'
    - Rotas `/(parceiro)/*` -- requer autenticacao + role = 'parceiro'
    - Redirecionar para `/login` se nao autenticado
    - Redirecionar para o painel correto apos login (admin → `/(admin)/dashboard`, parceiro → `/(parceiro)/dashboard`)
18. Funcionalidade de logout:
    - Botao no header/sidebar
    - Limpa sessao Supabase
    - Redireciona para `/login`
19. Paginas placeholder para dashboards:
    - `/(admin)/dashboard` -- pagina com texto "Dashboard Admin - Em construcao"
    - `/(parceiro)/dashboard` -- pagina com texto "Dashboard Parceiro - Em construcao"

### 4.5 Layout Base

20. Layout Admin `(admin)/layout.tsx`:
    - Sidebar com navegacao (itens do menu conforme estrutura de pastas do framework, Anexo D)
    - Header com nome do usuario logado e botao de logout
    - Area de conteudo principal
    - Menu items iniciais: Dashboard, Upload, Clinicas, Financeiro, Inadimplencia, Pagamentos, Configuracoes
    - Sub-items de Configuracoes: Clinicas, Procedimentos, Medicos, Financeiro
21. Layout Parceiro `(parceiro)/layout.tsx`:
    - Sidebar simplificada (somente: Dashboard, Orcamentos, Financeiro, Inadimplencia)
    - Header com nome da clinica e botao de logout
    - Visual diferenciado (pode usar glass morphism do design system)

### 4.6 CRUD Clinicas Parceiras

22. Tela de listagem (`/(admin)/configuracoes/clinicas/page.tsx`):
    - Tabela com colunas: Nome, CNPJ, Responsavel, Custo Mao de Obra, Split (%), Status (Ativa/Inativa)
    - Filtro por status (ativa/inativa/todas)
    - Botao "Nova Clinica"
23. Tela/Modal de criacao e edicao:
    - Campos: nome (obrigatorio), cnpj (unico), responsavel, email, telefone, custo_mao_de_obra (R$), percentual_split (%, default 40)
    - Validacao: nome obrigatorio, cnpj formato valido e unico, custo >= 0, split entre 0 e 100
    - Botao ativar/desativar clinica

### 4.7 CRUD Procedimentos

24. Tela de listagem (`/(admin)/configuracoes/procedimentos/page.tsx`):
    - Tabela: Nome, Codigo Clinicorp, Custo Fixo (R$), Categoria, Status (Ativo/Inativo)
    - Filtro por categoria e status
    - Botao "Novo Procedimento"
25. Tela/Modal de criacao e edicao:
    - Campos: nome (obrigatorio), codigo_clinicorp, custo_fixo (R$, obrigatorio), categoria, ativo (toggle)
    - Validacao: nome obrigatorio, custo_fixo >= 0

### 4.8 CRUD Medicos Indicadores

26. Tela de listagem (`/(admin)/configuracoes/medicos/page.tsx`):
    - Tabela: Nome, Clinica Vinculada, Comissao (%), Status (Ativo/Inativo)
    - Filtro por clinica
    - Botao "Novo Medico"
27. Tela/Modal de criacao e edicao:
    - Campos: nome (obrigatorio), clinica_id (dropdown de clinicas ativas, obrigatorio), percentual_comissao (%, default 10), ativo (toggle)
    - Validacao: nome obrigatorio, clinica obrigatoria, comissao entre 0 e 100

### 4.9 Configuracoes Financeiras

28. Tela de parametros (`/(admin)/configuracoes/financeiro/page.tsx`):
    - Nao e um CRUD tradicional -- e uma tela de configuracao com os parametros vigentes
    - Campos editaveis: taxa_cartao_percentual (%), imposto_nf_percentual (%), percentual_beauty_smile (%, default 60)
    - Exibir vigencia atual (vigencia_inicio)
    - Ao salvar novas configuracoes: criar novo registro com vigencia_inicio = hoje e fechar vigencia do anterior (vigencia_fim = ontem)
    - Historico de configuracoes anteriores visivel em tabela abaixo

### 4.10 Gestao de Usuarios (Basico)

29. O admin cria contas de parceiros manualmente. Nesta fase, pode ser feito via Supabase Dashboard (nao precisa de tela no sistema).
30. Documentar o processo de criacao de usuario:
    - Criar usuario no Supabase Auth (email + senha)
    - Inserir registro em `profiles` com role e clinica_id correspondente

---

## 5. Non-Goals (Out of Scope)

- **Upload de planilhas** -- sera coberto na Fase 2
- **Processamento de dados via n8n** -- sera coberto na Fase 2
- **Dashboard com KPIs e graficos** -- sera coberto na Fase 3
- **Registro de pagamentos** -- sera coberto na Fase 4
- **Tela de inadimplencia** -- sera coberto na Fase 4
- **Tela de gestao de usuarios no sistema** -- sera feito diretamente no Supabase Dashboard por enquanto
- **Deploy em producao (Vercel)** -- sera feito na Fase 5 (Polish)
- **Notificacoes Telegram** -- sera coberto nas Fases 2-4
- **Self-service de cadastro** -- parceiros nao se cadastram sozinhos (nunca)
- **Recuperacao de senha** -- pode ser adicionado depois (Supabase Auth suporta nativamente)

---

## 6. Design Considerations

### Templates do Design System a utilizar:
- **LoginAdmin** -- Tela de login
- **CRUD** -- Telas de configuracao (clinicas, procedimentos, medicos)
- **Settings** -- Tela de parametros financeiros

### Cores e Tema:
- Admin Theme: Deep Blue (#0A2463)
- Seguir padroes do `@beautysmile/design-system`
- Parceiro pode usar glass morphism para diferenciacao visual

### Navegacao:
- Sidebar fixa a esquerda com icones + texto
- Header fixo no topo com info do usuario
- Breadcrumbs opcionais para navegacao em sub-paginas

---

## 7. Technical Considerations

### Dependencias do projeto:
- `next` 14+ (App Router)
- `@supabase/supabase-js` e `@supabase/ssr` para integracao com Supabase
- `@beautysmile/design-system` para componentes UI (pacote publico no GitHub -- instalar via GitHub URL)
- `typescript` para tipagem

### Dominio:
- Producao: `dash.bslabs.com.br`
- Configurar dominio customizado no Vercel na Fase 5

### Supabase:
- Regiao: South America - Sao Paulo (sa-east-1) para menor latencia

### Dados Iniciais:
- **Clinicas**: 1 clinica parceira sera cadastrada via painel (dados preenchidos pelo admin no CRUD)
- **Procedimentos**: Lista de procedimentos com custos existe, sera cadastrada manualmente via CRUD de procedimentos

### Supabase Client Setup:
- Usar `@supabase/ssr` para criar clients adequados ao contexto (browser, server, middleware)
- Middleware do Next.js deve renovar a sessao automaticamente

### Tipagem TypeScript:
- Gerar types do Supabase com `supabase gen types typescript`
- Manter types em `src/types/database.types.ts`

### Estrutura de Pastas (conforme Anexo D do framework):
```
src/
  app/
    (auth)/login/
    (admin)/
      dashboard/
      configuracoes/
        clinicas/
        procedimentos/
        medicos/
        financeiro/
      layout.tsx
    (parceiro)/
      dashboard/
      layout.tsx
    api/
  components/
    shared/
  lib/
    supabase/   (client, server, middleware helpers)
    utils/
  types/
```

### Variaveis de Ambiente:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 8. Success Metrics

1. **Login funcional**: Admin e parceiro conseguem logar com email+senha e sao redirecionados para o painel correto
2. **RLS validado**: Parceiro logado nao consegue acessar dados de outra clinica (testar via DevTools/API direta)
3. **CRUDs operacionais**: Admin consegue criar, editar e listar clinicas, procedimentos, medicos e configuracoes financeiras
4. **Rotas protegidas**: Acesso a qualquer rota sem autenticacao redireciona para login; parceiro nao consegue acessar rotas admin
5. **Schema completo**: Todas as tabelas, indexes, views, triggers e functions existem no Supabase e estao corretas
6. **Dados de teste**: Pelo menos 1 clinica, 5 procedimentos, 1 medico, 1 configuracao financeira, 1 admin e 1 parceiro criados

---

## 9. Open Questions

Todas as questoes iniciais foram respondidas:

| # | Questao | Resposta |
|---|---------|----------|
| 1 | Design System publicado onde? | Publico no GitHub (instalar via GitHub URL) |
| 2 | Dominio definido? | Sim: `dash.bslabs.com.br` |
| 3 | Lista de procedimentos com custos? | Existe, sera cadastrada manualmente via CRUD |
| 4 | Quantas clinicas no lancamento? | 1 clinica, dados preenchidos via painel |
| 5 | Regiao Supabase? | South America - Sao Paulo (sa-east-1) |

**Sem questoes pendentes para esta fase.**

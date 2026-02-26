# Beauty Smile Partners Dashboard

Dashboard multi-tenant para gestao financeira das clinicas parceiras da Beauty Smile. Upload de planilhas Clinicorp, calculo automatico do split 60/40, controle de pagamentos e inadimplencia.

Stack: Next.js 14 (App Router) + Supabase + TypeScript + Tailwind CSS

## REGRAS INVIOLAVEIS

IMPORTANTE: Estas regras nao tem excecao.

- RLS ativo em TODAS as tabelas com dados multi-tenant — isolamento no banco, nao no codigo
- Valores monetarios: `DECIMAL(12,2)` — NUNCA float (arredondamento causa erros financeiros)
- Percentuais: `DECIMAL(5,2)` — mesma razao
- NUNCA hardcode secrets — use variaveis de ambiente (.env)
- NUNCA commite arquivos .env, credenciais ou dados sensiveis
- Validar TODOS os inputs no backend com Zod schemas — frontend valida UX, backend valida seguranca
- SEMPRE rode testes antes de considerar trabalho completo
- Quando tiver duvida sobre requisito ou abordagem, PERGUNTE — nao assuma

## Setup do Ambiente

```bash
git clone https://github.com/fercosnt/beautysmile-partners-dashboard.git
npm install
cp .env.example .env.local        # Preencher variaveis (ver .env.example)
npx supabase start                # Banco local (requer Docker)
npx supabase db reset             # Aplicar migrations + seed
npm run dev                       # http://localhost:3000
```

Variaveis obrigatorias no `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Chave anonima (publica)
- `SUPABASE_SERVICE_ROLE_KEY` — Chave de servico (NUNCA exponha no frontend)
- `N8N_WEBHOOK_URL` — URL base dos webhooks n8n (server-side only)
- `N8N_WEBHOOK_SECRET` — Secret compartilhado para autenticar webhooks

## Comandos Essenciais

```bash
npm run dev           # Dev server (porta 3000)
npm run build         # Build de producao
npm test              # Testes Jest
npm run test:watch    # Testes em modo watch
npm run test:coverage # Testes com cobertura
npm run test:e2e      # Testes Playwright (e2e)
npm run lint          # ESLint + TypeScript check
npx supabase db reset          # Reset banco local
npx supabase migration new <nome>  # Nova migracao SQL
```

## Arquitetura

```
app/
├── (auth)/              # Login
├── (admin)/             # Layout admin Beauty Smile (acesso total)
│   ├── dashboard/
│   ├── upload/          # Upload de planilhas XLSX
│   ├── clinicas/
│   │   └── [id]/        # Drill-down por clinica
│   ├── financeiro/
│   ├── inadimplencia/
│   ├── pagamentos/
│   └── configuracoes/
│       ├── clinicas/
│       ├── procedimentos/
│       ├── medicos/
│       └── financeiro/
├── (parceiro)/          # Layout parceiro (acesso filtrado por RLS, somente leitura)
│   ├── dashboard/
│   ├── orcamentos/
│   ├── financeiro/
│   └── inadimplencia/
├── api/                 # API Routes
│   ├── auth/            # Confirmacao email, reset senha
│   ├── upload/          # Preview e confirmacao de upload XLSX
│   ├── pagamentos/      # Registro e estorno de pagamentos
│   └── resumo/          # Calculo e recalculo do resumo mensal
└── layout.tsx           # Root layout

components/              # Componentes GLOBAIS compartilhados
├── ui/                  # Componentes UI base
├── charts/              # Graficos (recharts)
├── upload/              # Upload + preview XLSX
└── providers/           # Context providers (Sidebar, Theme, etc.)

lib/
├── supabase/            # Clients (client.ts, server.ts, middleware.ts, admin.ts)
├── utils/               # Formatacao, calculos, validacao
└── schemas/             # Zod schemas de validacao

supabase/
├── migrations/          # Schema SQL versionado (001_, 002_, ...)
└── functions/           # Edge Functions (Deno)

types/                   # TypeScript types (database.types.ts)
```

**Componentes co-locados**: componentes especificos de uma pagina ficam em `app/[pagina]/components/`, NAO na pasta global. Componentes compartilhados entre 2+ paginas ficam em `components/`.

## Code Style

- TypeScript strict mode, sem `any` — erros de tipo previnem bugs em producao
- ES modules (import/export), NUNCA CommonJS (require) — consistencia e tree-shaking
- Named exports apenas — facilita busca e refatoracao
- Componentes funcionais com React Hooks — sem class components
- Tailwind para estilos — sem CSS customizado, sem styled-components
- `@beautysmile/design-system` (Admin Theme - Deep Blue #0A2463) para UI
- Demais libs (graficos, icones, headless UI): consultar package.json do projeto

## Supabase & Banco de Dados

### Clients Supabase (SEMPRE 4 arquivos distintos — NUNCA misture contextos)

| Arquivo | Funcao | Quando usar |
|---------|--------|-------------|
| `lib/supabase/client.ts` | `createBrowserClient()` | Componentes client-side |
| `lib/supabase/server.ts` | `createServerClient()` | Server Components, API Routes |
| `lib/supabase/middleware.ts` | Middleware de auth | Refresh sessao, protecao de rotas |
| `lib/supabase/admin.ts` | Service role client | Operacoes privilegiadas (criar usuarios) |

### RLS (Row Level Security)

Coluna tenant: `clinica_id` — referencia `clinicas_parceiras(id)`
Roles: `admin` (Beauty Smile, acesso total) e `parceiro` (clinica, somente leitura dos seus dados)

Duas funcoes helper obrigatorias:

```sql
CREATE OR REPLACE FUNCTION auth_clinica_id() RETURNS UUID AS $$
    SELECT clinica_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
    SELECT role = 'admin' FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies padrao em TODA tabela com clinica_id:
-- CREATE POLICY "admin_full_access" ON tabela FOR ALL USING (is_admin());
-- CREATE POLICY "parceiro_read_own" ON tabela FOR SELECT USING (clinica_id = auth_clinica_id());
```

Estrutura da tabela profiles e schema completo: @supabase/migrations/

### Convencoes SQL

- PKs: `UUID DEFAULT gen_random_uuid()`
- Timestamps: `created_at/updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Soft delete: `ativo BOOLEAN NOT NULL DEFAULT true` (nunca DELETE fisico)
- Enums: `CREATE TYPE status_xxx AS ENUM (...)` para campos de status
- Indexes compostos: `(clinica_id, mes_referencia)` como minimo
- Triggers: `update_updated_at()` automatico em tabelas com `updated_at`
- Unique constraints: ex: `UNIQUE(clinica_id, mes_referencia, tipo)` para evitar duplicidade
- Migracoes: numeracao sequencial `001_nome.sql`, `002_nome.sql`
- Views SQL: para agregacoes complexas de dashboard (dados pre-calculados)

## API Routes

Padrao de resposta:

```typescript
// Sucesso
return NextResponse.json({ data: resultado }, { status: 200 })  // GET/PUT
return NextResponse.json({ data: criado }, { status: 201 })      // POST
return new NextResponse(null, { status: 204 })                   // DELETE

// Erro
return NextResponse.json({ error: "Mensagem clara" }, { status: 4xx })
```

- Toda API Route valida input com Zod ANTES de processar
- Verificar sessao via `createServerClient()` no inicio de toda route protegida
- Erros retornam mensagens claras, NUNCA stack traces em producao

### Rotas do projeto

| Rota | Metodo | Descricao | Auth |
|------|--------|-----------|------|
| `/api/upload/preview` | POST | Recebe XLSX, retorna JSON para preview | admin |
| `/api/upload/confirm` | POST | Envia dados confirmados + trigger n8n | admin |
| `/api/pagamentos` | POST | Registra pagamento + gera parcelas cartao | admin |
| `/api/pagamentos/[id]` | DELETE | Estorna pagamento + remove parcelas | admin |
| `/api/resumo/calcular` | POST | Trigger calculo resumo mensal via n8n | admin |
| `/api/resumo/recalcular` | POST | Recalcula resumo existente | admin |

## Automacao

- **Ferramenta**: n8n (self-hosted na Hostinger)
- Padrao webhook: frontend -> API Route -> n8n webhook -> processamento -> notificacao Telegram
- Notificacoes: Telegram para eventos criticos (upload processado, resumo calculado, erros)

### Workflows n8n

| Workflow | Trigger | Descricao |
|----------|---------|-----------|
| WF1: Upload Processing | Webhook POST | Valida, transforma e insere dados das planilhas |
| WF2: Calculo Resumo | Webhook POST | Cruza dados e gera resumo mensal com split 60/40 |
| WF3: Auto-recebimento | Cron diario 00:01 | Marca parcelas cartao como recebidas quando mes chega |
| WF4: Notificacoes | Eventos dos WFs | Envia alertas Telegram formatados |

## Testes

- Unitarios: Jest + Testing Library (`npm test`)
- E2E: Playwright (`npm run test:e2e`)
- Coverage minimo: 80%
- Testar: auth, RLS, fluxos de dados, componentes criticos
- SEMPRE rode `npm test` apos mudancas significativas
- Testes de integracao para validar que policies RLS funcionam corretamente

## Gotchas

- Supabase RLS: use `SECURITY DEFINER` nas funcoes helper — nao use `auth.uid()` direto nas policies
- Formato monetario BR "14.450,00" DEVE converter para `14450.00` antes de inserir no banco
- Auth: admin cria contas, sem self-service — signup controlado
- Dados de dashboard: leia de tabelas pre-calculadas (`resumo_mensal`), NAO faca queries pesadas em tempo real
- Ultima linha de planilha Clinicorp e totalizadora — detectar e ignorar no parse
- Nome do paciente vem com numero entre parenteses "Fabio (18)" — limpar com regex antes de inserir
- Coluna "Procedimento" na planilha de tratamentos usa "+" para separar procedimentos — split obrigatorio
- Status "APPROVED" na planilha = orcamento fechado; demais status = orcamento aberto
- Comissao medica e calculada sobre valor LIQUIDO (com deducoes proporcionais por orcamento)
- Parcelas de cartao: D+30, primeira parcela recebe no mes seguinte ao pagamento

## Comportamento do Claude

- **Pergunte antes de assumir**: Se requisito, abordagem ou scope estiver ambiguo, pergunte. Nao invente.
- **Plan Mode**: Para tarefas que tocam 3+ arquivos ou decisoes arquiteturais, use EnterPlanMode e aguarde aprovacao ANTES de implementar
- **TodoWrite**: Para tarefas com 3+ passos, crie lista de tarefas e atualize progresso em tempo real
- **Explore primeiro**: Leia arquivos relevantes antes de sugerir mudancas — entenda o contexto existente
- **Atomicidade vertical**: Implemente model SQL + API Route + componente UI + teste JUNTOS, nao em camadas separadas
- **Verificar sempre**: Rode testes e lint antes de considerar qualquer tarefa completa

### Padroes de implementacao

- Dashboards: KPIs em cards no topo + graficos + drill-down por entidade
- Formularios: React Hook Form + Zod + componentes do design system
- Tabelas: componentes com filtros, paginacao e export
- Modais: Dialog para CRUD (criar/editar)

## Git

- Branches: `feature/nome`, `fix/descricao`, `chore/tarefa`
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
- PRs: titulo curto (<70 chars), body com Summary + Test Plan
- NUNCA force-push em main/master
- Commits pequenos e frequentes, nao diffs massivos

## Referencias Detalhadas

Para detalhes que nao precisam estar em toda sessao:

- Schema SQL completo + tabela profiles: @supabase/migrations/
- Framework do projeto: @tasks/framework-beauty-smile-partners.md
- PRD Fase 1 (Fundacao): @tasks/prd-fase1-fundacao.md
- PRD Fase 2 (Upload): @tasks/prd-fase2-upload-processamento.md
- PRD Fase 3 (Dashboards): @tasks/prd-fase3-dashboards.md
- PRD Fase 4 (Pagamentos): @tasks/prd-fase4-pagamentos-inadimplencia.md
- Design system: @beautysmile/design-system (Admin Theme)
- Deploy: Vercel (dash.bslabs.com.br)

## VERIFICACAO ANTES DE CONCLUIR

Antes de considerar QUALQUER tarefa completa, verifique:

- [ ] `npm test` — testes passam
- [ ] `npm run build` — build funciona sem erros
- [ ] `npm run lint` — sem erros de tipo ou lint
- [ ] RLS aplicado em novas tabelas (policies + funcoes helper)
- [ ] Valores monetarios usam DECIMAL(12,2)
- [ ] Inputs validados com Zod no backend
- [ ] Nenhum secret hardcoded no codigo
- [ ] Migracao SQL criada para mudancas de schema
- [ ] API Routes retornam status codes corretos e mensagens de erro claras

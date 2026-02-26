# Convencoes SQL

Estas regras aplicam-se a TODOS os arquivos SQL e migracoes do projeto.

## Tipos de Dados

- PKs: `UUID DEFAULT gen_random_uuid()` — nunca SERIAL ou INT
- Timestamps: `TIMESTAMPTZ NOT NULL DEFAULT now()` para `created_at` e `updated_at`
- Valores monetarios: `DECIMAL(12,2)` — NUNCA float, double ou numeric sem precisao
- Percentuais: `DECIMAL(5,2)` — mesma razao
- Soft delete: `ativo BOOLEAN NOT NULL DEFAULT true` — nunca DELETE fisico
- Status: `CREATE TYPE status_xxx AS ENUM (...)` — nunca TEXT livre para status

## Estrutura de Tabela

Toda tabela com dados multi-tenant DEVE ter:

1. Coluna de tenant (`clinica_id UUID NOT NULL REFERENCES clinicas_parceiras(id)`)
2. `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
3. `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
4. `ativo BOOLEAN NOT NULL DEFAULT true`
5. Trigger `update_updated_at()` para atualizar `updated_at` automaticamente
6. RLS habilitado com policies usando `is_admin()` e `auth_clinica_id()`

## Indexes

- SEMPRE criar index composto em `(clinica_id, ...)` como minimo
- Partial indexes onde aplicavel: `WHERE ativo = true` ou `WHERE status != 'quitado'`
- Unique constraints explicitos: ex: `UNIQUE(clinica_id, mes_referencia, tipo)`

## Migracoes

- Numeracao sequencial: `001_initial_schema.sql`, `002_functions.sql`
- Uma responsabilidade por migracao — nao misture schema com seed data
- RLS policies na MESMA migracao que cria a tabela
- Testar migracao com `npx supabase db reset` antes de commitar

## RLS

- SEMPRE usar funcoes `SECURITY DEFINER` para acessar `auth.uid()` — nunca direto nas policies
- Funcao `auth_clinica_id()` retorna clinica_id do usuario logado
- Funcao `is_admin()` verifica se usuario e admin
- Admin: full access. Parceiro: acesso filtrado por clinica_id (somente leitura)

## Anti-Patterns SQL

- NUNCA construa SQL raw no codigo da aplicacao — use Supabase client ou migracoes
- NUNCA use `SELECT *` em queries de producao — liste as colunas
- NUNCA armazene JSON quando uma tabela relacional serve — JSON para dados verdadeiramente flexiveis
- NUNCA crie migracoes que fazem DROP sem backup plan

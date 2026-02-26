Implemente uma nova feature seguindo o workflow padrao. Feature: $ARGUMENTS

## Workflow

### 1. Entender
- Leia o CLAUDE.md e arquivos relevantes do projeto
- Se o requisito for ambiguo, PERGUNTE antes de prosseguir
- Identifique quais camadas serao afetadas (SQL, API, UI, testes)

### 2. Planejar
- Use EnterPlanMode para tarefas que tocam 3+ arquivos
- Apresente o plano com:
  - Tabelas/migrations necessarias
  - API Routes a criar/modificar
  - Componentes de UI
  - Testes a escrever
- Aguarde aprovacao ANTES de implementar

### 3. Implementar (atomicidade vertical)
Execute nesta ordem, commitando cada camada:

1. **Migration SQL**: Schema, RLS policies, indexes, triggers
2. **Zod schemas**: Validacao de input/output em `lib/schemas/`
3. **API Routes**: Endpoints em `app/api/`
4. **Componentes UI**: Paginas e componentes em `app/`
5. **Testes**: Unitarios + integracao para cada camada

### 4. Verificar
- Rode `npm test` — todos passam?
- Rode `npm run build` — build funciona?
- Rode `npm run lint` — sem erros?
- RLS aplicado nas novas tabelas?
- Valores monetarios usam DECIMAL(12,2)?

### 5. Finalizar
- Crie commit(s) com Conventional Commits
- Resuma o que foi implementado

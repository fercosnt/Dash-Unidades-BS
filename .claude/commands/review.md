Revise as mudancas recentes neste projeto. Argumento opcional: $ARGUMENTS

## Escopo

Se um argumento foi fornecido, foque a revisao nele (arquivo, pasta ou PR).
Se nenhum argumento, revise todas as mudancas nao commitadas (`git diff` + `git diff --staged`).

## Checklist de Revisao

1. **Seguranca**
   - RLS aplicado em novas tabelas?
   - Inputs validados com Zod no backend?
   - Secrets hardcoded?
   - SQL injection possivel?

2. **Corretude**
   - Valores monetarios usam DECIMAL(12,2)?
   - Logica de negocio esta correta?
   - Edge cases cobertos?

3. **Padroes do projeto**
   - TypeScript strict, sem `any`?
   - Named exports?
   - Componentes co-locados corretamente?
   - Client Supabase correto para o contexto (client vs server vs admin)?

4. **Testes**
   - Testes criados ou atualizados para as mudancas?
   - Rode `npm test` e reporte resultado.

5. **Migracao SQL**
   - Mudancas de schema tem migracao correspondente?
   - RLS policies incluidas na migracao?

## Output

Formate como:
- **CRITICO**: [problemas que DEVEM ser corrigidos antes de merge]
- **IMPORTANTE**: [problemas que DEVERIAM ser corrigidos]
- **SUGESTAO**: [melhorias opcionais]
- **OK**: [o que esta correto e bem implementado]

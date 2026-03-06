# Segurança

## npm audit

### Tratadas (sem breaking change)

- **xlsx**: removido; uso de **exceljs** em `lib/utils/xlsx-parser.ts`. Apenas `.xlsx` suportado.
- **@tootallnate/once** e **glob**: versões seguras via `overrides` no `package.json`.

### Next.js (corrigido)

- O projeto foi atualizado para **Next 15.5.10** e **React 19** para corrigir as vulnerabilidades GHSA-9g9p-9gw9-jx7f e GHSA-h25m-26qc-wcjf.
- **Não use** `npm audit fix --force` para não subir para Next 16 sem planejamento.

## .git/index.lock

Se aparecer `Unable to create '.git/index.lock': File exists`:

1. Feche IDE/terminais que usem o repo.
2. Se persistir: `Remove-Item -Force ".git/index.lock"` (apenas se nenhum Git estiver rodando).

# Guia de Inicializacao de Projeto

Use este guia ao clonar o template para um novo projeto.
Preencha cada secao e delete este arquivo quando terminar.

---

## 0. Copiar Template para o Projeto

Peca ao Claude para copiar os arquivos do template para o repositorio do projeto:

```
Copie o template de projeto de ~/Downloads/Skill Prompt/ para o meu repositorio em [CAMINHO DO PROJETO].
Copie apenas os arquivos do template, nao os arquivos de pesquisa.
```

O Claude deve executar:

```bash
# Definir caminhos
TEMPLATE="$HOME/Downloads/Skill Prompt"
PROJETO="[CAMINHO DO PROJETO]"

# Copiar arquivos raiz
cp "$TEMPLATE/CLAUDE.md" "$PROJETO/"
cp "$TEMPLATE/CLAUDE.local.md" "$PROJETO/"
cp "$TEMPLATE/.env.example" "$PROJETO/"
cp "$TEMPLATE/.gitignore" "$PROJETO/"
cp "$TEMPLATE/decisions.md" "$PROJETO/"
cp "$TEMPLATE/INICIAR-PROJETO.md" "$PROJETO/"

# Copiar estrutura .claude/ (settings, commands, rules)
mkdir -p "$PROJETO/.claude/commands"
mkdir -p "$PROJETO/.claude/rules"
cp "$TEMPLATE/.claude/settings.json" "$PROJETO/.claude/"
cp "$TEMPLATE/.claude/settings.local.json" "$PROJETO/.claude/"
cp "$TEMPLATE/.claude/commands/review.md" "$PROJETO/.claude/commands/"
cp "$TEMPLATE/.claude/commands/new-feature.md" "$PROJETO/.claude/commands/"
cp "$TEMPLATE/.claude/rules/sql.md" "$PROJETO/.claude/rules/"
cp "$TEMPLATE/.claude/rules/security.md" "$PROJETO/.claude/rules/"
```

### Arquivos copiados

| Arquivo | Commitado? | Funcao |
|---------|-----------|--------|
| `CLAUDE.md` | Sim | Padrao do projeto |
| `CLAUDE.local.md` | Nao | Overrides pessoais |
| `.env.example` | Sim | Template de variaveis |
| `.gitignore` | Sim | Exclusoes (merge com existente se ja houver) |
| `decisions.md` | Sim | Log de decisoes arquiteturais |
| `INICIAR-PROJETO.md` | Temporario | Este guia — deletar apos preencher |
| `.claude/settings.json` | Sim | Permissoes do time |
| `.claude/settings.local.json` | Nao | Permissoes pessoais |
| `.claude/commands/review.md` | Sim | Slash command `/review` |
| `.claude/commands/new-feature.md` | Sim | Slash command `/new-feature` |
| `.claude/rules/sql.md` | Sim | Convencoes SQL (auto-carregado) |
| `.claude/rules/security.md` | Sim | Regras de seguranca (auto-carregado) |

**IMPORTANTE**: Se o projeto ja tem `.gitignore`, faca merge manual em vez de sobrescrever. Garanta que estas linhas existam:

```gitignore
# Claude Code (pessoal)
.claude/settings.local.json
CLAUDE.local.md

# Ambiente
.env
.env.local
.env.*.local
```

Apos copiar, prossiga para a secao 1 abaixo.

---

## 1. Informacoes do Projeto

Preencha e use para customizar os arquivos:

| Campo | Valor | Onde usar |
|-------|-------|-----------|
| Nome do projeto | __________________ | CLAUDE.md (linha 1) |
| Descricao (1 frase) | __________________ | CLAUDE.md (linha 3) |
| URL do repositorio | __________________ | CLAUDE.md (Setup, linha 24) |
| Design system | __________________ | CLAUDE.md (Code Style, linha 94) |

## 2. Roles e Multi-tenancy

| Campo | Valor | Onde usar |
|-------|-------|-----------|
| Nome da coluna tenant | ex: `clinica_id`, `empresa_id` | CLAUDE.md (RLS), rules/sql.md |
| Tabela pai do tenant | ex: `clinicas`, `empresas` | CLAUDE.md (RLS) |
| Roles do sistema | ex: `admin`, `parceiro`, `equipe` | CLAUDE.md (RLS) |
| Route group por role | ex: `(parceiro)/`, `(equipe)/` | CLAUDE.md (Arquitetura) |

## 3. Modulos do Sistema

Liste os modulos que o admin e cada role terao:

**Admin:**
- [ ] dashboard
- [ ] ________________
- [ ] ________________
- [ ] configuracoes

**[Role 2]:**
- [ ] dashboard
- [ ] ________________
- [ ] ________________

## 4. API Routes

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/api/auth/` | POST | Auth (ja incluso) |
| `/api/___/` | _____ | ________________ |
| `/api/___/` | _____ | ________________ |
| `/api/___/` | _____ | ________________ |

## 5. Variaveis de Ambiente

Atualize o `.env.example` com as variaveis do projeto:

| Variavel | Obrigatoria? | Descricao |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | Ja inclusa |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Ja inclusa |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Ja inclusa |
| `___________________` | _________ | ________________ |
| `___________________` | _________ | ________________ |

## 6. Automacao

| Campo | Valor | Onde usar |
|-------|-------|-----------|
| Ferramenta de automacao | ex: n8n, Inngest, nenhuma | CLAUDE.md (Automacao) |
| Canal de notificacao | ex: Telegram, Slack, email | CLAUDE.md (Automacao) |

Workflows planejados:

| Workflow | Trigger | Descricao |
|----------|---------|-----------|
| ________________ | __________ | ________________ |
| ________________ | __________ | ________________ |

## 7. Gotchas do Projeto

Liste armadilhas especificas que Claude precisa saber:

- [ ] ________________
- [ ] ________________
- [ ] ________________

## 8. Decisoes Arquiteturais

Registre no `decisions.md`:

- [ ] Stack (ja inclusa como exemplo)
- [ ] Multi-tenancy (ja inclusa como exemplo)
- [ ] ________________
- [ ] ________________

---

## Checklist de Inicializacao

Execute nesta ordem:

- [ ] Preencher campos acima
- [ ] **CLAUDE.md**: Substituir todos os `[CUSTOMIZAR: ...]` com valores reais
- [ ] **CLAUDE.md**: Remover exemplo da linha 4 (`Exemplo: "Dashboard..."`)
- [ ] **.env.example**: Adicionar variaveis especificas do projeto
- [ ] **CLAUDE.local.md**: Ajustar URLs locais se diferentes do padrao
- [ ] **.claude/rules/sql.md**: Substituir `tenant_id` pelo nome real da coluna
- [ ] **decisions.md**: Substituir `[DATA]` pela data real, adicionar decisoes do projeto
- [ ] Rodar `npm install && npx supabase start && npm run dev` para validar setup
- [ ] Deletar este arquivo (INICIAR-PROJETO.md)

---

## Busca Rapida: Onde Customizar

Para encontrar todos os pontos de customizacao em todos os arquivos:

```bash
grep -rn "CUSTOMIZAR" . --include="*.md" --include="*.json"
```

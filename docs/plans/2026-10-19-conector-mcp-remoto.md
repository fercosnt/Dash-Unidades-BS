# Plano — Conector MCP remoto do fechamento (OAuth Supabase)

**Data:** 2026-10-19 · **Upstream:** `PRD/PRD-fechamento-plugin.md` (F2) · **Status:** aprovado pelo Fernando, em implementação

## Por que

O plugin `bs-fechamento` 0.1.0 roda um servidor MCP local (Node) com login por script de terminal. A Duda usa **Windows + Claude Desktop**: script e caminho de pasta não servem. Decisão: o MCP passa a morar **dentro do Dash (Vercel)** como conector remoto com **OAuth 2.1 do Supabase** — a pessoa clica "Conectar" no Claude, abre a página de login do Dash, aprova, pronto (igual aos outros conectores).

## Já feito (fora do código)

- Supabase **OAuth Server habilitado** (beta), **Dynamic Client Registration ligado**, authorization path = `https://dashunidades.bslabs.com.br/oauth/consent`.
- Discovery ok: `https://fywopbgtqueoplqdegrw.supabase.co/.well-known/oauth-authorization-server/auth/v1` (issuer `https://fywopbgtqueoplqdegrw.supabase.co/auth/v1`, authorize `/auth/v1/oauth/authorize`, token `/auth/v1/oauth/token`, register `/auth/v1/oauth/clients/register`, PKCE S256).
- Domínio canônico do Dash: **`https://dashunidades.bslabs.com.br`** (o `dash-unidades-bs.vercel.app` também responde).
- F1 em produção: `app/api/fechamento/[acao]/route.ts` + `lib/fechamento/*` (status, mapear, fechar, comissão, auth Bearer), migration 027 aplicada.

## O que construir

### 1. Ações compartilhadas (sem duplicar lógica)
Extrair os handlers do `switch` de `app/api/fechamento/[acao]/route.ts` para `lib/fechamento/acoes.ts` (funções puras de orquestração que recebem `{ admin, userId }` + input validado e devolvem o resultado ou lançam erro com mensagem em PT). A rota REST passa a chamar essas funções; o MCP também. Comportamento da REST inalterado.

### 2. Servidor MCP remoto — `https://dashunidades.bslabs.com.br/api/mcp`
- Transport Streamable HTTP em rota Next.js. Usar o pacote da Vercel `mcp-handler` (verificar API atual via docs: `createMcpHandler`, `withMcpAuth`, `protectedResourceHandler`/metadados) ou o SDK `@modelcontextprotocol/sdk` direto — o que for mais simples e estável com Next 15 + Node runtime. Nada de `runtime = 'edge'`.
- **Auth obrigatória**: `Authorization: Bearer <access token emitido pelo Supabase OAuth>`. Validar com `admin.auth.getUser(token)` + `profiles.role = 'admin'` (reusar `lib/fechamento/auth.ts`). Sem token → 401 com `WWW-Authenticate` apontando para o protected resource metadata (exigido pela spec MCP para o Claude descobrir o login).
- **Protected Resource Metadata** (RFC 9728) em `/.well-known/oauth-protected-resource` (e a variante com path `/.well-known/oauth-protected-resource/api/mcp` se o handler exigir): `resource` = URL do MCP, `authorization_servers` = `["https://fywopbgtqueoplqdegrw.supabase.co/auth/v1"]`. Garantir que o `middleware.ts` não redirecione `/.well-known/*` nem `/api/mcp` para login.
- **Tools** (mesmos nomes/semântica `confirmar` da 0.1.0, ver `fernando-claude-marketplace/bs-fechamento/server/src/index.ts`): `bs_conexao` (usuário logado + clínicas), `bs_catalogo`, `bs_status`, `bs_mapear_procedimentos`, `bs_gravar_procedimentos`, `bs_criar_regra`, `bs_sync`, `bs_indicacao`, `bs_lancar_despesa`, `bs_comissao_dentista`, `bs_recalcular`, `bs_fechar`, `bs_reabrir`.
  - **Mudança:** servidor remoto não lê arquivo local → `bs_ler_planilha` sai; `bs_mapear_procedimentos` e `bs_gravar_procedimentos` recebem **`linhas`** (`{data YYYY-MM-DD, paciente, procedimento, valor?, profissional?}[]`) em vez de `caminho`. O Claude lê o `.xlsx` do lado dele (anexo no Desktop / leitura local no Code) e envia as linhas. Validar que todas as linhas são do mês.
  - Resolução de nomes (clínica por nome/subscriber/id; médico; procedimento; categoria) igual à 0.1.0.
  - Toda tool de escrita: `confirmar=false` → prévia; `true` → grava (via `lib/fechamento/acoes.ts`). Registrar `userId` do token.

### 3. Página de aprovação — `app/oauth/consent/page.tsx`
- Recebe `?authorization_id=...` do Supabase. Exige sessão: se não logado, mandar para `/login` **preservando o retorno** (conferir se o login já suporta `next`/`redirect`; se não, adicionar com validação de path interno).
- Buscar detalhes com a API OAuth do supabase-js (`supabase.auth.oauth.getAuthorizationDetails(authorizationId)` e `approveAuthorization` / `denyAuthorization` — confirmar nomes na versão instalada; atualizar `@supabase/supabase-js` se necessário).
- **Travas:** (a) só `profiles.role = 'admin'` pode aprovar (demais veem "acesso negado"); (b) **allowlist do redirect_uri do cliente**: host `claude.ai`, `claude.com`, `localhost`, `127.0.0.1` — qualquer outro: recusa (deny) e mostra aviso. Função pura `redirectPermitido(uri)` com teste.
- UI simples no padrão do app (Tailwind, sem design system externo): "O **{cliente}** quer acessar o Dash Unidades BS como **{nome}** para fazer o fechamento mensal" + Aprovar / Recusar.

### 4. Plugin `bs-fechamento` 0.2.0 (repo `~/code/fernando-claude-marketplace`, branch nova)
- `.mcp.json` → servidor remoto: `{"mcpServers":{"bs-fechamento":{"type":"http","url":"https://dashunidades.bslabs.com.br/api/mcp"}}}`.
- Remover `server/`, `servers/`, `instalar/` (login agora é OAuth) e o comando `bs-fechamento-setup` vira orientação de **conectar** (Claude Desktop/Teams: conector; Claude Code: `/mcp` → autenticar).
- Skills: trocar "caminho do xlsx" por "anexe a planilha / leia o arquivo e envie as linhas"; `bs_ler_planilha` sai das referências.
- Versão 0.2.0 em `plugin.json` **e** `marketplace.json`; README, CHANGELOG, tabela de segurança do README do marketplace (trava = login OAuth admin no Dash).
- `claude plugin validate ./bs-fechamento` e `claude plugin validate .`.

## Fora do escopo agora
Rede v2, tela de status (F3), remoção do wizard antigo.

## Critérios de pronto
- `npx tsc --noEmit`, `npx eslint` nos arquivos tocados, `npx jest`, `npm run build` passam.
- Teste unitário: `redirectPermitido` e mapeamento input→ação das tools principais.
- `curl https://.../api/mcp` sem token → 401 com `WWW-Authenticate` (validar localmente com `npm run dev` se possível).
- **Nada vai para produção sem OK do Fernando**: commits locais (Dash na `main` local, marketplace em branch), sem push, sem PR merge, sem migration.

## Depois (com o Fernando)
1. Push do Dash → deploy. 2. Teste do fluxo: Claude Code `claude mcp add --transport http bs-fechamento https://dashunidades.bslabs.com.br/api/mcp` → `/mcp` autenticar. 3. Teams: adicionar conector customizado (org) com a URL; Duda conecta. 4. PR do plugin 0.2.0 + merge.

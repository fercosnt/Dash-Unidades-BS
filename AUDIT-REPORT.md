# AUDITORIA COMPLETA — Beauty Smile Partners Dashboard

**Data:** 2026-03-19
**Escopo:** Seguranca, codigo, arquitetura, tipos, erros silenciosos, build/deploy
**Agentes:** 6 analises independentes em paralelo

---

## RESUMO EXECUTIVO

O projeto esta funcional e bem estruturado para seu tamanho (~130 arquivos). O build passa com sucesso. Porem, foram encontrados **problemas criticos de seguranca** que devem ser corrigidos ANTES do deploy, alem de bugs que afetam calculos financeiros.

| Severidade | Qtde | Categoria principal |
|------------|------|---------------------|
| **CRITICO** | 11 | Seguranca (auth bypass) + erros silenciosos financeiros |
| **ALTO** | 15 | Bugs, queries N+1, error handling |
| **MEDIO** | 18 | DRY violations, tipos, acessibilidade |
| **BAIXO** | 8 | Convencoes, organizacao |

---

## 1. SEGURANCA — CRITICO (Corrigir ANTES do deploy)

### 1.1 Admin Server Actions sem verificacao de role (CRITICO)

**O problema:** Nenhum Server Action em `app/admin/` verifica se o usuario e admin (exceto `fechamento/actions.ts`). Um usuario `parceiro` logado pode chamar qualquer Server Action admin diretamente via POST.

**Afetados:** TODOS os arquivos de actions em `app/admin/` (~15 arquivos, ~40 funcoes)

**Correcao:** Criar `lib/auth/require-admin.ts` e chamar em todo Server Action admin:

```ts
// lib/auth/require-admin.ts
export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nao autorizado");
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Acesso negado");
  return user.id;
}
```

### 1.2 Admin Layout nao verifica role (CRITICO)

**Arquivo:** `app/admin/layout.tsx` linhas 60-81

O layout verifica se existe usuario logado, mas NAO verifica `profile.role === "admin"`. Parceiro que acessa `/admin/dashboard` ve todo o painel admin.

**Correcao:** Adicionar apos fetch do profile:
```ts
if (profile?.role !== "admin") { redirect("/parceiro/dashboard"); }
```

### 1.3 Admin Client (service role) usado sem auth check (CRITICO)

**Arquivos:**
- `app/admin/configuracoes/clinicas/actions.ts` — criarClinica, atualizarClinica, etc.
- `app/admin/configuracoes/usuarios/actions.ts` — criarUsuario, resetarSenha, etc.

Usam `createSupabaseAdminClient()` (bypassa RLS) sem verificar se o caller e admin.

### 1.4 Webhook secret aceito via query parameter (ALTO)

**Arquivo:** `app/api/parcelas/marcar-recebidas/route.ts` linhas 14-17

Secret aparece em logs de acesso, browser history, referrer headers. Aceitar apenas via header.

### 1.5 Comparacao de secrets nao e timing-safe (MEDIO)

**Arquivos:** `route.ts` de parcelas e calcular-interno

Usar `crypto.timingSafeEqual()` em vez de `!==`.

### 1.6 Parceiro layout nao redireciona quando user e null (MEDIO)

**Arquivo:** `app/parceiro/layout.tsx` linhas 41-44

Faz query com `id = ""` em vez de redirecionar para login.

---

## 2. BUGS CONFIRMADOS (Corrigir antes do deploy)

### 2.1 `custo_fixo` removido do retorno de `getProcedimentosAtivos` (CRITICO)

**Arquivo:** `app/admin/upload/revisao/actions.ts` linha 96

```ts
// BUG: custo_fixo nao e incluido no map
return (data ?? []).map((r) => ({ id: r.id, nome: r.nome }));
```

`RevisaoProcedimentosClient.tsx` tenta usar `p.custo_fixo` (linha 79) mas recebe `undefined`. KPIs de custo sempre mostram R$ 0,00.

**Correcao:** `return (data ?? []).map((r) => ({ id: r.id, nome: r.nome, custo_fixo: r.custo_fixo ?? 0 }));`

### 2.2 `handleConfirmReplace` — race condition com setState (CRITICO)

**Arquivo:** `app/admin/upload/UploadPageClient.tsx` linhas 136-139

```ts
function handleConfirmReplace() {
  setSubstituir(true);  // async!
  doUpload();           // le substituir = false (closure)
}
```

`doUpload()` executa antes do state atualizar. Substituicao nunca acontece.

**Correcao:** Passar valor diretamente: `doUpload(true)`.

### 2.3 `Number(form.percentual_split) ?? 40` — NaN nao e null (ALTO)

**Arquivo:** `app/admin/configuracoes/clinicas/actions.ts` linhas 52, 82

`Number("abc")` = `NaN`. `NaN ?? 40` = `NaN` (porque NaN nao e null/undefined). O fallback nunca dispara. Clinica pode ser salva com `percentual_split: NaN`, corrompendo todos os calculos.

**Correcao:** Usar `|| 40` ou validar com Zod.

### 2.4 Comissao medica calculada sobre valor bruto (MEDIO)

**Arquivo:** `app/admin/comissoes/actions.ts` linhas 22-36

CLAUDE.md especifica: "Comissao calculada sobre valor liquido proporcional". O codigo usa `valor_total` (bruto). Comissoes ficam maiores que o correto.

---

## 3. ERROS SILENCIOSOS — Sistema Financeiro (CRITICO)

### 3.1 Resumo mensal persiste zeros quando queries falham

**Arquivo:** `lib/resumo-calculo.ts` — 5 de 7 queries ignoram `{ error }`

Se Supabase falhar (timeout, RLS, etc.), o resumo e calculado com todos valores = 0 e **gravado no banco**, sobrescrevendo dados corretos. O admin ve R$ 0,00 e acha que a clinica nao faturou.

### 3.2 Upload auto-split engole TODAS as excecoes

**Arquivo:** `app/api/upload/route.ts` linhas 190-192 — `catch {}` vazio

Split falha silenciosamente. Admin ve "upload concluido" mas itens_orcamento nunca foram criados. Aba Vendas e DRE ficam vazios sem explicacao.

### 3.3 Webhook n8n falha silenciosamente

**Arquivos:** `app/api/upload/route.ts`, `app/api/pagamentos/route.ts`, `app/api/pagamentos/[id]/route.ts`

Todos tem `catch {}` vazio para chamada do webhook. Se n8n cair, resumo_mensal nunca atualiza e dashboard mostra dados desatualizados indefinidamente.

### 3.4 Dashboard queries retornam zeros em vez de erro

**Arquivo:** `lib/dashboard-queries.ts` — TODAS as ~15 funcoes

Nenhuma propaga erros. Admin ve dashboard zerado e nao sabe se e "sem dados" ou "query falhou".

### 3.5 Nenhum log no servidor

O codebase inteiro tem ZERO chamadas a `console.error`, `console.warn` ou qualquer sistema de logging. Impossivel diagnosticar problemas em producao.

---

## 4. TIPOS E VALIDACAO

### 4.1 `types/database.types.ts` NAO EXISTE (CRITICO)

O arquivo esta listado no CLAUDE.md como arquivo-chave mas nao existe no disco. Resultado:
- 56 ocorrencias de `Record<string, unknown>` em 14 arquivos
- 20+ definicoes `type Row = {...}` inline repetidas
- 5 usos de `as any`
- Nenhuma query Supabase tem type safety real

**Correcao:** `npx supabase gen types typescript --project-id <id> > types/database.types.ts`

### 4.2 Zod usado em apenas 3 de 19 Server Actions

Apenas `repasses/actions.ts`, `debitos/actions.ts`, `dentistas/actions.ts` validam input. Todas as outras mutations aceitam dados sem validacao — Server Actions sao endpoints publicos no Next.js.

### 4.3 Retorno de actions inconsistente

Dois padroes misturados sem tipo compartilhado:
- `{ ok: boolean; error?: string }` (maioria)
- `throw new Error(message)` (usuarios, clinicas, procedimentos, financeiro)

**Correcao:** Criar `ActionResult<T>` compartilhado.

---

## 5. PERFORMANCE

### 5.1 Queries N+1 (ALTO)

| Funcao | Arquivo | Problema |
|--------|---------|----------|
| `vincularProcedimentoBulk` | `upload/revisao/actions.ts:153` | N updates sequenciais em vez de `.in("id", ids)` |
| `vincularAutomaticamente` | `upload/revisao/actions.ts:186` | Mesmo problema |
| `fetchFechamentoStatus` | `fechamento/actions.ts:101` | 2 queries por mes (12 meses = 24 queries) |
| `calcularComissoesMes` | `comissoes/actions.ts:21` | 2N queries (N = medicos) |

### 5.2 Staleness check em cada page load

`autoCalcResumoSeNecessario` roda em cada render de `/admin/dashboard`. Para 3 clinicas: 10 queries extras antes de renderizar qualquer dado.

### 5.3 `fetchTratamentosVendidosFromItens` sem filtro de data

**Arquivo:** `lib/dashboard-queries.ts` linha 801

Busca TODOS os `itens_orcamento` e filtra em memoria. Vai degradar com volume de dados.

### 5.4 Charts carregados eagerly

`DashboardClient.tsx` importa todos os componentes Recharts no top-level. Nenhum usa `dynamic(() => import(...))`. Bundle de 479 kB na rota `/admin/fechamento`.

---

## 6. BUILD E DEPLOY

### 6.1 Build: PASSA com avisos

- 38 rotas compiladas com sucesso
- 1 aviso de workspace root ambiguo (dois `package-lock.json`)
- Rota `/admin/fechamento` com 479 kB First Load JS

### 6.2 TypeScript: 1 ERRO

```
lib/utils/xlsx-transforms.test.ts(29,55): error TS2345
```

Tipo incompativel em dados de teste.

### 6.3 ESLint: NAO CONFIGURADO

`npm run lint` falha pedindo configuracao. Nenhum `.eslintrc` ou `eslint.config.mjs` existe.

### 6.4 Migrations

- 14 migrations em ordem, SQL valido
- Migrations 011-014 provavelmente pendentes no Supabase remoto

### 6.5 Secrets

- `.env.local` protegido pelo `.gitignore` ✅
- `RESUMO_SERVICE_SECRET` e `N8N_WEBHOOK_SECRET` ausentes do `.env.example`

### 6.6 Rota duplicada

- `/admin/configuracoes/fechamento/` — pagina antiga, sem link no sidebar
- `/admin/fechamento/` — wizard novo, linkado no sidebar

Pagina antiga e codigo morto acessivel.

---

## 7. QUALIDADE DE CODIGO

### 7.1 DRY violations

- `firstDayOfMonth` / `lastDayOfMonth` duplicada em **9 arquivos**
- `formatCurrency` reimplementada em **35 arquivos** (existe em `lib/utils/formatting.ts` mas ninguem importa)

### 7.2 Acessibilidade

- Nenhum modal tem: Escape para fechar, focus trap, `role="dialog"`, `aria-modal`
- 5+ modais afetados em todo o codebase

### 7.3 Componentes monoliticos

- `DashboardClient.tsx` (~460 linhas, 14 useState, 15 props)
- Tabelas inline no JSX que deveriam ser componentes

### 7.4 Zero error.tsx / loading.tsx

Nenhum arquivo `error.tsx` ou `loading.tsx` em todo o `app/`. Se um Server Component falhar, a pagina inteira quebra sem fallback.

---

## PLANO DE ACAO — Priorizado

### ANTES DO DEPLOY (Bloqueantes)

| # | Acao | Status |
|---|------|--------|
| 1 | Criar `requireAdmin()` e adicionar em todos admin actions | ✅ `ea08b37` |
| 2 | Adicionar role check no `AdminLayout` | ✅ `ea08b37` |
| 3 | Fix bug `custo_fixo` em `getProcedimentosAtivos` | ✅ `ea08b37` |
| 4 | Fix race condition `handleConfirmReplace` | ✅ `ea08b37` |
| 5 | Fix `Number() ?? fallback` → `Number() \|\| fallback` | ✅ `ea08b37` |
| 6 | Remover secret de query params em webhook | ✅ `ea08b37` |
| 7 | Adicionar redirect no parceiro layout quando user null | ✅ `ea08b37` |

### POS-DEPLOY (Importantes)

| # | Acao | Status |
|---|------|--------|
| 8 | Gerar `types/database.types.ts` | ✅ `3160c4a` |
| 9 | Checar `{ error }` em todas as queries Supabase | ✅ `3160c4a` |
| 10 | Adicionar `console.error` em todos os catch blocks | ✅ `3160c4a` |
| 11 | Converter queries N+1 para bulk | ✅ `3160c4a` |
| 12 | Adicionar Zod em todas as mutations | ✅ `3160c4a` |
| 13 | Centralizar `firstDayOfMonth` e `formatCurrency` | ✅ `3160c4a` |
| 14 | Configurar ESLint | ✅ `3160c4a` |
| 15 | Comissao medica sobre valor bruto | ✅ Documentacao corrigida (era regra correta, CLAUDE.md estava errado) |
| 16 | Aplicar migrations 011-014 no Supabase remoto | ⏳ Manual via Supabase Studio |

### FUTURO (Nice to have)

| # | Acao |
|---|------|
| 17 | Adicionar `error.tsx` e `loading.tsx` nas rotas |
| 18 | Dynamic import para Recharts |
| 19 | Criar `ActionResult<T>` compartilhado |
| 20 | Acessibilidade nos modais (Escape, focus trap, aria) |
| 21 | Remover rota duplicada `/admin/configuracoes/fechamento/page.tsx` |
| 22 | Extrair tabelas inline do DashboardClient em componentes |

---

*Relatorio gerado por 6 agentes especializados rodando em paralelo.*

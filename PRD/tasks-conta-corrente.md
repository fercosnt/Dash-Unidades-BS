# Tasks — Conta Corrente do Parceiro

**Parent**: `PRD/PRD.md` (+ plano técnico `docs/plans/2026-06-06-conta-corrente-parceiro.md`)
**Gerado em**: 2026-06-07
**Slicing**: vertical (default)
**Total slices**: 7 (6 Direto / 1 Bloqueante)

> Pré-condições já aplicadas em produção (auditoria 2026-06-07): fix do débito no caixa, "A Receber" atribuível ao mês, e registro do pagamento do Walmir. Os números de referência abaixo já valem. Falta só a limpeza retroativa dos 3 repasses/abatimentos (Slice 1).
>
> **Número-âncora de verificação (atualizado 2026-06-07):** saldo da Hirata = **−249.711,84** (mai) / **−243.701,84** (com jun). _Revisado de −251.311,84/−246.101,84: o anchor original não contava as parcelas 1–3 do cartão do Walmir (abr/mai/jun, R$2.000 cada), que já estão `recebido` em caixa. A RPC, correta pelo modelo (RF-01, caixa real), as inclui → +R$800/mês no resultado a partir de abril._

---

- [ ] **Slice 0: Criar feature branch** [Direto]
  - Branch: `feature/conta-corrente-parceiro`
  - Base: `main` (`git pull` antes)

---

- [ ] **Slice 1: Admin vê o saldo e o extrato da conta corrente da clínica** [Bloqueante]

  **Demo**: Admin abre `/admin/repasses` (renomeada "Conta Corrente"), escolhe a Hirata e vê o **saldo decomposto** (taxa a amortizar R$250k / operacional acumulado / saldo −251.311,84) + o **extrato** linha a linha (abertura → resultados mensais).

  **Camadas tocadas**: schema (RPC + migration) + data migration (retroativo) + função pura + query + UI + teste

  **Bloqueado por**: Slice 0

  **Se Bloqueante — decisão pendente**: a migration **023** é escrita **destrutiva em produção** (apaga 3 repasses + 3 abatimentos da Hirata, zera `valor_pago`). Precisa de **confirmação do Fernando** antes de aplicar. Reversível, mas confirmar.

  **Subtarefas** (schema → data → função → query → UI → teste):
  - [ ] Migration `022_conta_corrente_parceiro.sql`: RPC `calcular_resultado_mensal_parceiro` + `repasses_mensais` (add `tipo`, drop `UNIQUE(clinica,mes)`) — aplicar via `mcp__supabase__apply_migration`
  - [x] Verificar RPC por SQL contra os números (jan −3483,44 · fev +2331,20 · mar −1850,24 · abr **+632,64** · mai **+2658,00** · jun +6010,00)
  - [ ] **[CONFIRMAR ANTES]** Migration `023_corrigir_repasses_retroativo.sql`: delete abatimentos + repasses da Hirata, `debito_parceiro` valor_pago→0
  - [ ] `lib/utils/extrato-parceiro.ts` + teste (TDD): `montarExtrato(saldoInicial, mesAbertura, resultados, pagamentosImpl, repasses)` com 4 tipos de linha
  - [ ] `lib/saldo-parceiro-queries.ts`: `fetchContaCorrente` (saldo, operacionalAcumulado, extrato, dividaImplementacao.aAmortizar, competenciaAcumulada)
  - [ ] `app/admin/repasses/page.tsx` + `RepassesClient.tsx`: seletor de clínica + saldo decomposto (RF-10) + extrato (read-only nesta slice); label sidebar "Repasses" → "Conta Corrente"

  **Arquivos relevantes**:
  - `supabase/migrations/022_conta_corrente_parceiro.sql`, `023_corrigir_repasses_retroativo.sql`
  - `lib/utils/extrato-parceiro.ts` (+ `.test.ts`), `lib/saldo-parceiro-queries.ts`
  - `app/admin/repasses/page.tsx`, `app/admin/repasses/RepassesClient.tsx`, `components/shared/Sidebar.tsx`

  **Verificação** (DEMONSTRÁVEL quando):
  - [ ] RPC retorna os resultados mensais corretos (SQL)
  - [ ] `npm test -- extrato-parceiro` passa
  - [ ] Após 023: `select count(*) from repasses_mensais where clinica_id=Hirata` = 0; `debito.valor_pago` = 0
  - [ ] `npm run dev` → `/admin/repasses` mostra saldo **−249.711,84** decomposto + extrato; `npx tsc --noEmit` limpo

  **Commit**: `feat(conta-corrente): admin ve saldo decomposto + extrato (RPC + retroativo)`

---

- [ ] **Slice 2: Admin registra um repasse em dinheiro (bloqueado se saldo ≤ 0)** [Direto]

  **Demo**: Com saldo negativo (Hirata), o admin tenta registrar repasse e recebe o bloqueio "saldo não positivo". (Com saldo positivo, o repasse é gravado, aparece como `−` no extrato e reduz o saldo.)

  **Camadas tocadas**: API (action) + UI + teste

  **Bloqueado por**: Slice 1

  **Subtarefas**:
  - [ ] Reescrever `app/admin/repasses/actions.ts`: `registrarRepasse` (guard `saldo > 0` e `valor ≤ saldo`, via `fetchContaCorrente`) + `desfazerRepasse`
  - [ ] UI: form "Registrar repasse" (valor, data, obs) desabilitado/avisando se `!podeRepassar`; botão desfazer por linha de repasse; `router.refresh()`
  - [ ] Ajustar call sites antigos (`darBaixaRepasse`/`desfazerRepasse`)

  **Arquivos relevantes**:
  - `app/admin/repasses/actions.ts`, `app/admin/repasses/RepassesClient.tsx`

  **Verificação**:
  - [ ] Repasse com saldo ≤ 0 → erro claro, nada gravado
  - [ ] (Cenário positivo, manual) repasse grava, vira `−` no extrato, saldo cai; desfazer reverte
  - [ ] `npx tsc --noEmit` + `npm run lint` limpos

  **Commit**: `feat(conta-corrente): registrar repasse em dinheiro (bloqueia saldo<=0)`

---

- [ ] **Slice 3: Admin registra pagamento da implementação (parceiro→BS) como evento +** [Direto]

  **Demo**: Admin registra um pagamento da taxa de implementação dentro da Conta Corrente; ele aparece como linha `+` no extrato e a "taxa a amortizar" diminui.

  **Camadas tocadas**: API + UI + teste

  **Bloqueado por**: Slice 1

  **Subtarefas**:
  - [ ] Garantir que `fetchContaCorrente` lê `abatimentos_debito` com `repasse_id` null como evento `+` (já no plano — verificar)
  - [ ] Surface da ação `registrarPagamentoDebito` (existente em `app/admin/configuracoes/debitos/actions.ts`) dentro da Conta Corrente (form valor + mês)
  - [ ] Encolher a config "Débitos parceiros" para só cadastrar/editar a taxa (mover o registro de pagamento para a Conta Corrente)

  **Arquivos relevantes**:
  - `lib/saldo-parceiro-queries.ts`, `app/admin/repasses/RepassesClient.tsx`
  - `app/admin/configuracoes/debitos/` (DebitosClient — remover ação de pagamento)

  **Verificação**:
  - [ ] Registrar pagamento de implementação → +linha no extrato, `aAmortizar` reduz, saldo sobe
  - [ ] `npx tsc --noEmit` limpo

  **Commit**: `feat(conta-corrente): pagamento de implementacao como evento no extrato`

---

- [ ] **Slice 4: Parceiro vê sua conta corrente (read-only)** [Direto]

  **Demo**: Parceiro loga, abre `/parceiro/financeiro` → aba "Conta Corrente" e vê saldo decomposto + extrato completo (só da própria clínica, via RLS).

  **Camadas tocadas**: UI + (RLS já existe) + teste manual

  **Bloqueado por**: Slice 1

  **Subtarefas**:
  - [ ] `app/parceiro/financeiro/page.tsx`: resolver clínica do parceiro (RLS/`auth_clinica_id`) + `fetchContaCorrente`
  - [ ] `FinanceiroParceiroClient.tsx`: aba "Conta Corrente" (saldo decomposto RF-10 + extrato), read-only; reaproveitar componentes do admin (DRY)

  **Arquivos relevantes**:
  - `app/parceiro/financeiro/page.tsx`, `app/parceiro/financeiro/FinanceiroParceiroClient.tsx`

  **Verificação**:
  - [ ] Logado como parceiro: vê só a própria clínica, números corretos, sem ações de escrita
  - [ ] `npx tsc --noEmit` limpo

  **Commit**: `feat(conta-corrente): aba do parceiro (saldo + extrato, read-only)`

---

- [ ] **Slice 5: Saldo nos dashboards (lista admin / card parceiro)** [Direto]

  **Demo**: No dashboard admin aparece "Saldo por parceiro" (1 linha por clínica ativa, com link); no dashboard do parceiro, um card com o saldo decomposto compacto.

  **Camadas tocadas**: UI + teste

  **Bloqueado por**: Slice 1

  **Subtarefas**:
  - [ ] Admin dashboard: lista "Saldo por parceiro" (1 linha/clínica ativa, verde/vermelho, link p/ Conta Corrente)
  - [ ] Parceiro dashboard: card de saldo (compacto) + link p/ aba Conta Corrente

  **Arquivos relevantes**:
  - `app/admin/dashboard/page.tsx`, `app/admin/dashboard/DashboardClient.tsx`
  - `app/parceiro/dashboard/` (page + client)

  **Verificação**:
  - [ ] Card/lista bate com o saldo da página de Conta Corrente
  - [ ] `npx tsc --noEmit` + `npm run lint` limpos

  **Commit**: `feat(conta-corrente): saldo nos dashboards (lista admin, card parceiro)`

---

- [ ] **Slice 6: Types + documentação** [Direto]

  **Demo**: (chore) types regenerados e docs descrevem o modelo de conta corrente.

  **Camadas tocadas**: types + docs

  **Bloqueado por**: Slice 1 (schema final), idealmente após Slice 5

  **Subtarefas**:
  - [ ] Regenerar `types/database.types.ts` (`mcp__supabase__generate_typescript_types`)
  - [ ] CLAUDE.md: seção "Conta corrente do parceiro" (modelo, RPC, convenção de sinal, custos do resumo, repasse só com saldo>0, regra 30%, calote 40/60) + tabela de arquivos-chave
  - [ ] decisions.md: registrar a decisão (conta única, franquia, BS banca negativos)

  **Arquivos relevantes**:
  - `types/database.types.ts`, `CLAUDE.md`, `decisions.md`

  **Verificação**:
  - [ ] `npx tsc --noEmit` + `npm run lint` limpos

  **Commit**: `docs(conta-corrente): documenta modelo + regenera types`

---

## Ordem de execução

`0 → 1` (núcleo, com a confirmação da migration 023) → **2, 3, 4, 5 em paralelo** (todas dependem só da 1) → `6` (fechamento).

## Fora de escopo (ver PRD §3b/§10)
Alerta de "quando pagar" (v2), perda por calote definitivo (v2), juros/vencimento da implementação, onboarding multi-clínica, `%BS` multi-vigência, órfãos valor=0.

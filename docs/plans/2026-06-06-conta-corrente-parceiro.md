# Conta Corrente do Parceiro — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> **Fonte de verdade:** `PRD/PRD.md` (modelo de **conta corrente única**). Este plano foi realinhado a ele em 2026-06-07.

**Goal:** Substituir o repasse mensal isolado (modelo quebrado, gera negativos absurdos) por uma **conta corrente única do parceiro** — um saldo que abre com a taxa de implementação (negativo) ou 0 (à vista), é alimentado pelo resultado mensal `40% × (recebido − custos)` e debitado por repasses em dinheiro (só permitidos quando o saldo é positivo).

**Architecture:** O resultado operacional mensal é calculado por uma **RPC Postgres** (`calcular_resultado_mensal_parceiro`) sobre todo mês-calendário (inclusive meses sem venda, onde só a mão de obra fixa entra como custo), reusando os custos já materializados em `resumo_mensal` e o caixa real de `pagamentos`/`parcelas_cartao`. A montagem do extrato (saldo inicial + resultados + repasses → saldo corrido) é uma **função TS pura** (unit-testável). A taxa de implementação (`debito_parceiro`) vira o **saldo de abertura** da conta — operações auto-amortizam (sem conceito de "abatimento"). Repasse em dinheiro só quando o saldo é positivo.

**Tech Stack:** Next.js 15 (App Router, Server Actions), Supabase (Postgres + RPC + RLS), TypeScript, Zod, Jest (funções puras), Tailwind.

**Convenção de saldo:** negativo = parceiro deve à BS (dívida de implementação + float operacional); positivo = BS deve ao parceiro. Parceiro nunca aporta; **só saca com saldo > 0** (modelo franquia).

**Projeto Supabase produção:** `Dash-Unidades-BS` (`fywopbgtqueoplqdegrw`). Clínica única ativa: Hirata (`d543b244-cdd7-4f39-b569-12a6639da019`).

**Números de referência (Hirata) — extrato esperado após a correção retroativa (atualizado 2026-06-07, validado pela RPC em produção):**

| Linha | valor | saldo acumulado |
|-------|------:|----------------:|
| Abertura — Taxa de implementação (jan) | −250.000,00 | −250.000,00 |
| Resultado Jan | −3.483,44 | −253.483,44 |
| Resultado Fev | +2.331,20 | −251.152,24 |
| Resultado Mar | −1.850,24 | −253.002,48 |
| Resultado Abr | +632,64 | −252.369,84 |
| Resultado Mai | +2.658,00 | **−249.711,84** |
| Resultado Jun* | +6.010,00 | −243.701,84 |

\* Jun parcial e sem venda nova — testa o caso "mês sem venda só com mão de obra fixa". Resultado mensal = `40% × (recebido − custos)`; custos do mês = custos do `resumo_mensal` (meses com venda) ou só a mão de obra fixa (meses sem venda).

> **Revisão do anchor (2026-06-07):** os valores originais (abr −167,36 · mai +1.858 · saldo mai −251.311,84) **não contavam as parcelas 1–3 do cartão do Walmir** (abr/mai/jun, R$2.000 cada), que já estão `recebido` em caixa. Pelo modelo (RF-01, caixa real) elas entram no `recebido` do mês → +R$800/mês no resultado a partir de abril. A RPC, correta, produz os números acima. Anchor passou a **−249.711,84 (mai) / −243.701,84 (jun)**.

> **Pré-condição já cumprida (2026-06-07):** correções de dados da auditoria aplicadas em produção (fix do débito, A Receber atribuível ao mês, e **registro do pagamento do Walmir** — cartão 7x, parcelas geradas, `resumo` recalculado). Com isso os números de referência acima refletem o estado atual. A inadimplência real restante é só Adriana (fev R$7.000). **Pagamento de implementação (evento `+`):** Hirata é financiada (lista vazia); a leitura de `abatimentos_debito` com `repasse_id` null cobre parceiros que pagarem a implementação em dinheiro.

---

## Task 1: Migration — schema do repasse + RPC do resultado mensal

**Files:**
- Create: `supabase/migrations/022_conta_corrente_parceiro.sql`

**Step 1: Escrever a migration**

```sql
-- 022: Conta corrente do parceiro (modelo único)
-- (a) repasse: permitir 0..N por mês (saída em dinheiro); remover unique por mês.
--     coluna `tipo` mantida ('dinheiro') p/ extensibilidade futura, sem ramificação.
ALTER TABLE repasses_mensais
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'dinheiro'
    CHECK (tipo IN ('dinheiro'));

ALTER TABLE repasses_mensais
  DROP CONSTRAINT IF EXISTS repasses_mensais_clinica_id_mes_referencia_key;

-- (b) RPC: resultado operacional por mês-calendário (todo mês desde a 1ª atividade)
--     resultado = (1 - %BS) × (recebido_caixa_do_mês − custos_do_mês)
--     custos: reusa resumo_mensal (meses com venda); meses sem venda = só mão de obra fixa
CREATE OR REPLACE FUNCTION calcular_resultado_mensal_parceiro(p_clinica_id uuid)
RETURNS TABLE (
  mes date,
  recebido numeric,
  custos numeric,
  resultado numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cfg AS (
    SELECT (1 - percentual_beauty_smile/100.0) AS pct_parceiro
    FROM configuracoes_financeiras WHERE vigencia_fim IS NULL LIMIT 1
  ),
  clinica AS (
    SELECT custo_mao_de_obra AS mao_obra FROM clinicas_parceiras WHERE id = p_clinica_id
  ),
  bounds AS (
    SELECT date_trunc('month', LEAST(
      COALESCE((SELECT MIN(mes_referencia) FROM orcamentos_fechados WHERE clinica_id=p_clinica_id), CURRENT_DATE),
      COALESCE((SELECT MIN(data_pagamento) FROM pagamentos WHERE clinica_id=p_clinica_id), CURRENT_DATE)
    ))::date AS ini,
    date_trunc('month', CURRENT_DATE)::date AS fim
  ),
  meses AS (
    SELECT generate_series(b.ini, b.fim, interval '1 month')::date AS mes FROM bounds b
  ),
  recebido_diretos AS (
    SELECT date_trunc('month', pg.data_pagamento)::date AS mes, SUM(pg.valor) AS v
    FROM pagamentos pg
    WHERE pg.clinica_id = p_clinica_id
      AND NOT (pg.forma = 'cartao_credito' AND pg.parcelas > 1)
    GROUP BY 1
  ),
  recebido_parcelas AS (
    SELECT date_trunc('month', pc.mes_recebimento)::date AS mes, SUM(pc.valor_parcela) AS v
    FROM parcelas_cartao pc
    WHERE pc.clinica_id = p_clinica_id AND pc.status = 'recebido'
    GROUP BY 1
  ),
  custos_resumo AS (
    SELECT date_trunc('month', mes_referencia)::date AS mes,
           (total_taxa_cartao + total_imposto_nf + total_custo_mao_obra
            + total_custos_procedimentos + total_comissoes_medicas) AS c
    FROM resumo_mensal WHERE clinica_id = p_clinica_id
  )
  SELECT
    m.mes,
    ROUND(COALESCE(rd.v,0) + COALESCE(rp.v,0), 2) AS recebido,
    ROUND(COALESCE(cr.c, (SELECT mao_obra FROM clinica)), 2) AS custos,
    ROUND((SELECT pct_parceiro FROM cfg)
          * (COALESCE(rd.v,0) + COALESCE(rp.v,0)
             - COALESCE(cr.c, (SELECT mao_obra FROM clinica))), 2) AS resultado
  FROM meses m
  LEFT JOIN recebido_diretos rd ON rd.mes = m.mes
  LEFT JOIN recebido_parcelas rp ON rp.mes = m.mes
  LEFT JOIN custos_resumo cr ON cr.mes = m.mes
  ORDER BY m.mes;
$$;

GRANT EXECUTE ON FUNCTION calcular_resultado_mensal_parceiro(uuid) TO authenticated;
```

**Step 2: Aplicar** via `mcp__supabase__apply_migration` (project `fywopbgtqueoplqdegrw`, name `022_conta_corrente_parceiro`).

**Step 3: Verificar a RPC** (MCP execute_sql):
```sql
SELECT to_char(mes,'YYYY-MM') mes, recebido, custos, resultado
FROM calcular_resultado_mensal_parceiro('d543b244-cdd7-4f39-b569-12a6639da019');
```
Expected: jan −3483,44 · fev +2331,20 · mar −1850,24 · abr +632,64 · mai +2658,00 · jun +6010,00 (custos jun = 6000; inclui parcelas recebido do Walmir abr/mai/jun).

**Step 4: Commit**
```bash
git add supabase/migrations/022_conta_corrente_parceiro.sql
git commit -m "feat(conta-corrente): RPC resultado mensal + repasse 0..N por mes"
```

---

## Task 2: Migration — correção retroativa (zerar histórico, dívida volta a abertura)

**Files:**
- Create: `supabase/migrations/023_corrigir_repasses_retroativo.sql`

**Step 1: Escrever a migration**

```sql
-- 023: corrigir histórico da Hirata para o modelo de conta única.
-- Os 3 repasses (fev/mar/abr) eram debt-abatement (nenhum dinheiro saiu p/ o parceiro).
-- No modelo único, a taxa de implementação é a abertura da conta (saldo inicial = -valor_total)
-- e as operações auto-amortizam. Logo: remover repasses/abatimentos e zerar valor_pago.
DELETE FROM abatimentos_debito
WHERE debito_id IN (SELECT id FROM debito_parceiro
                    WHERE clinica_id = 'd543b244-cdd7-4f39-b569-12a6639da019');

DELETE FROM repasses_mensais
WHERE clinica_id = 'd543b244-cdd7-4f39-b569-12a6639da019';

UPDATE debito_parceiro
SET valor_pago = 0, status = 'ativo'
WHERE clinica_id = 'd543b244-cdd7-4f39-b569-12a6639da019'
  AND descricao = 'Taxa de Implementação';
```

> ⚠️ **Escrita destrutiva em produção.** Confirmar com o usuário antes de aplicar. Reversível (recriável a partir dos valores documentados na auditoria).

**Step 2: Aplicar** via `mcp__supabase__apply_migration` (name `023_corrigir_repasses_retroativo`) — **após confirmação**.

**Step 3: Verificar**
```sql
SELECT descricao, valor_total, valor_pago, status FROM debito_parceiro
WHERE clinica_id='d543b244-cdd7-4f39-b569-12a6639da019';
SELECT count(*) repasses FROM repasses_mensais WHERE clinica_id='d543b244-cdd7-4f39-b569-12a6639da019';
SELECT count(*) abat FROM abatimentos_debito;
```
Expected: "Taxa de Implementação" valor_pago 0 / status ativo; 0 repasses; 0 abatimentos.

**Step 4: Commit**
```bash
git add supabase/migrations/023_corrigir_repasses_retroativo.sql
git commit -m "fix(conta-corrente): correcao retroativa Hirata (abertura -250k, remove historico)"
```

---

## Task 3: Função pura `montarExtrato` (TDD)

**Files:**
- Create: `lib/utils/extrato-parceiro.ts`
- Test: `lib/utils/extrato-parceiro.test.ts`
- Prior art: `lib/utils/calculos-financeiros.test.ts`

**Step 1: Escrever o teste que falha**

```typescript
import { montarExtrato } from "./extrato-parceiro";

describe("montarExtrato", () => {
  it("começa pelo saldo de abertura (taxa de implementação)", () => {
    const ext = montarExtrato(-250000, "2026-01", [], []);
    expect(ext[0]).toMatchObject({ tipo: "abertura", valor: -250000, saldo: -250000 });
  });

  it("acumula resultados mensais sobre a abertura", () => {
    const ext = montarExtrato(-250000, "2026-01", [
      { mes: "2026-01", resultado: -3483.44 },
      { mes: "2026-02", resultado: 2331.20 },
    ], []);
    expect(ext.at(-1)!.saldo).toBeCloseTo(-251152.24, 2);
  });

  it("conta única que abre em 0 (implementação à vista)", () => {
    const ext = montarExtrato(0, "2026-01", [{ mes: "2026-01", resultado: 1000 }], []);
    expect(ext.at(-1)!.saldo).toBeCloseTo(1000, 2);
  });

  it("repasse em dinheiro debita o saldo", () => {
    const ext = montarExtrato(0, "2026-01",
      [{ mes: "2026-01", resultado: 5000 }],
      [{ mes: "2026-02", valor: 2000 }]);
    expect(ext.at(-1)!).toMatchObject({ tipo: "repasse" });
    expect(ext.at(-1)!.saldo).toBeCloseTo(3000, 2);
  });

  it("ordena cronologicamente; resultado antes do repasse no mesmo mês", () => {
    const ext = montarExtrato(0, "2026-01",
      [{ mes: "2026-01", resultado: 1000 }],
      [{ mes: "2026-01", valor: 400 }]);
    expect(ext.map((e) => e.tipo)).toEqual(["abertura", "resultado", "repasse"]);
    expect(ext.at(-1)!.saldo).toBeCloseTo(600, 2);
  });
});
```

**Step 2: Rodar e ver falhar** — `npm test -- extrato-parceiro` → FAIL.

**Step 3: Implementar o mínimo**

```typescript
export type ResultadoMensal = { mes: string; resultado: number };
export type Movimento = { mes: string; valor: number };
export type LinhaExtrato = {
  mes: string;
  tipo: "abertura" | "resultado" | "pagamento_implementacao" | "repasse";
  valor: number; // abertura/resultado/pagamento somam (±); repasse subtrai
  saldo: number;
};

/**
 * Monta o extrato (conta corrente única) do parceiro.
 * Linha 1 = saldo de abertura (taxa de implementação, −valor_total; ou 0 se sem dívida).
 * Depois intercala, em ordem cronológica: resultados mensais (±), pagamentos da
 * implementação em dinheiro (+, parceiro→BS) e repasses (−, BS→parceiro), com saldo corrido.
 */
export function montarExtrato(
  saldoInicial: number,
  mesAbertura: string,
  resultados: ResultadoMensal[],
  pagamentosImplementacao: Movimento[],
  repasses: Movimento[]
): LinhaExtrato[] {
  const eventos: Omit<LinhaExtrato, "saldo">[] = [
    { mes: mesAbertura, tipo: "abertura", valor: saldoInicial },
    ...resultados.map((r) => ({ mes: r.mes, tipo: "resultado" as const, valor: r.resultado })),
    ...pagamentosImplementacao.map((p) => ({ mes: p.mes, tipo: "pagamento_implementacao" as const, valor: Math.abs(p.valor) })),
    ...repasses.map((p) => ({ mes: p.mes, tipo: "repasse" as const, valor: -Math.abs(p.valor) })),
  ];
  const ordem = { abertura: 0, pagamento_implementacao: 1, resultado: 2, repasse: 3 } as const;
  eventos.sort((a, b) =>
    a.mes === b.mes ? ordem[a.tipo] - ordem[b.tipo] : a.mes < b.mes ? -1 : 1
  );

  let saldo = 0;
  return eventos.map((e) => {
    saldo = Math.round((saldo + e.valor) * 100) / 100;
    return { ...e, saldo };
  });
}
```

> Nos testes, adicionar caso de `pagamento_implementacao` (+) entrando no saldo, e ajustar as chamadas para a nova assinatura (5 args). Para Hirata (financiada) não há pagamentos de implementação — lista vazia.

**Step 4: Rodar e ver passar** — `npm test -- extrato-parceiro` → PASS (5 testes).

**Step 5: Commit**
```bash
git add lib/utils/extrato-parceiro.ts lib/utils/extrato-parceiro.test.ts
git commit -m "feat(conta-corrente): montarExtrato com saldo de abertura (TDD)"
```

---

## Task 4: Query layer `saldo-parceiro-queries.ts`

**Files:**
- Create: `lib/saldo-parceiro-queries.ts`
- Reference: `lib/debito-queries.ts`, `lib/utils/extrato-parceiro.ts`

**Step 1: Implementar a interface única**

```typescript
"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { montarExtrato, type LinhaExtrato } from "@/lib/utils/extrato-parceiro";

export type ContaCorrente = {
  saldo: number;                  // saldo atual (negativo = parceiro deve; positivo = BS deve)
  podeRepassar: boolean;          // saldo > 0
  operacionalAcumulado: number;   // saldo − abertura (Σ resultados + Σ pagto impl − Σ repasses)
  extrato: LinhaExtrato[];
  dividaImplementacao: { descricao: string; valorTotal: number; aAmortizar: number } | null;
  competenciaAcumulada: number;   // Σ valor_clinica — total que o parceiro vai ganhar
};

export async function fetchContaCorrente(clinicaId: string): Promise<ContaCorrente> {
  const supabase = await createSupabaseServerClient();

  const [{ data: resultados }, { data: repasses }, { data: resumos }, { data: debito }] =
    await Promise.all([
      supabase.rpc("calcular_resultado_mensal_parceiro", { p_clinica_id: clinicaId }),
      supabase.from("repasses_mensais")
        .select("mes_referencia, valor_repasse").eq("clinica_id", clinicaId),
      supabase.from("resumo_mensal")
        .select("valor_clinica").eq("clinica_id", clinicaId),
      supabase.from("debito_parceiro")
        .select("id, descricao, valor_total, valor_pago, data_inicio")
        .eq("clinica_id", clinicaId).eq("status", "ativo").maybeSingle(),
    ]);

  const d = debito as Record<string, unknown> | null;
  const saldoInicial = d ? -Number(d.valor_total) : 0;
  const mesAbertura = d ? String(d.data_inicio).slice(0, 7) : "2026-01";

  // Pagamentos da implementação em dinheiro (parceiro→BS) = abatimentos sem repasse vinculado
  let pagamentosImpl: { mes: string; valor: number }[] = [];
  if (d) {
    const { data: abat } = await supabase
      .from("abatimentos_debito")
      .select("mes_referencia, valor_abatido")
      .eq("debito_id", d.id as string)
      .is("repasse_id", null);
    pagamentosImpl = (abat ?? []).map((a: Record<string, unknown>) => ({
      mes: String(a.mes_referencia).slice(0, 7),
      valor: Number(a.valor_abatido ?? 0),
    }));
  }

  const extrato = montarExtrato(
    saldoInicial,
    mesAbertura,
    (resultados ?? []).map((r: Record<string, unknown>) => ({
      mes: String(r.mes).slice(0, 7),
      resultado: Number(r.resultado ?? 0),
    })),
    pagamentosImpl,
    (repasses ?? []).map((p: Record<string, unknown>) => ({
      mes: String(p.mes_referencia).slice(0, 7),
      valor: Number(p.valor_repasse ?? 0),
    }))
  );

  const saldo = extrato.at(-1)?.saldo ?? saldoInicial;
  const competenciaAcumulada = Math.round(
    (resumos ?? []).reduce((a, r: Record<string, unknown>) => a + Number(r.valor_clinica ?? 0), 0) * 100
  ) / 100;

  return {
    saldo,
    podeRepassar: saldo > 0,
    operacionalAcumulado: Math.round((saldo - saldoInicial) * 100) / 100,
    extrato,
    dividaImplementacao: d
      ? { descricao: String(d.descricao), valorTotal: Number(d.valor_total),
          aAmortizar: Number(d.valor_total) - Number(d.valor_pago) }
      : null,
    competenciaAcumulada,
  };
}
```

> **Decomposição (RF-10):** a UI mostra `dividaImplementacao.aAmortizar` (taxa a amortizar), `operacionalAcumulado` (resultado operacional acumulado) e `saldo` (a soma), + `competenciaAcumulada` como referência.

**Step 2: Verificar** `npx tsc --noEmit` limpo; saldo da Hirata = **−249.711,84** (mai) / **−243.701,84** (com jun).

**Step 3: Commit**
```bash
git add lib/saldo-parceiro-queries.ts
git commit -m "feat(conta-corrente): fetchContaCorrente (saldo unico + extrato)"
```

---

## Task 5: Action de repasse (só com saldo positivo)

**Files:**
- Modify: `app/admin/repasses/actions.ts` (substituir `darBaixaRepasse`/`desfazerRepasse`)

**Step 1: Implementar `registrarRepasse` e `desfazerRepasse`**

Regras (RF-04/05):
- `registrarRepasse`: `requireAdmin()`; recalcula `fetchContaCorrente` server-side; **bloqueia** se `saldo ≤ 0` ou `valor > saldo`; insere `repasses_mensais` (tipo='dinheiro').
- `desfazerRepasse(id)`: remove o registro. (Sem abatimentos no modelo novo; pode remover a lógica de reversão de abatimento.)

```typescript
"use server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { fetchContaCorrente } from "@/lib/saldo-parceiro-queries";
import { z } from "zod";

const RepasseSchema = z.object({
  clinicaId: z.string().uuid(),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/),
  valor: z.number().positive(),
  dataTransferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observacao: z.string().optional(),
});

export async function registrarRepasse(input: unknown) {
  const parsed = RepasseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const { clinicaId, mesReferencia, valor, dataTransferencia, observacao } = parsed.data;
  const { supabase } = await requireAdmin();

  const conta = await fetchContaCorrente(clinicaId);
  if (conta.saldo <= 0)
    return { ok: false, error: "Saldo não positivo — parceiro ainda não pode receber em dinheiro." };
  if (valor > conta.saldo + 0.001)
    return { ok: false, error: `Valor excede o saldo disponível (R$ ${conta.saldo.toFixed(2)}).` };

  const { error } = await supabase.from("repasses_mensais").insert({
    clinica_id: clinicaId,
    mes_referencia: `${mesReferencia}-01`,
    valor_repasse: valor,
    tipo: "dinheiro",
    data_transferencia: dataTransferencia,
    observacao: observacao ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function desfazerRepasse(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("repasses_mensais").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

**Step 2: Verificar** `npx tsc --noEmit`; `grep -rn "darBaixaRepasse" app/ lib/` → ajustar call sites na Task 6.

**Step 3: Commit**
```bash
git add app/admin/repasses/actions.ts
git commit -m "feat(conta-corrente): registrarRepasse bloqueia saldo<=0"
```

---

## Task 6: UI admin — "Conta Corrente" (renomear Repasses)

**Files:**
- Modify: `app/admin/repasses/page.tsx`
- Modify: `app/admin/repasses/RepassesClient.tsx`
- Modify: menu (`components/shared/Sidebar.tsx`) — label "Repasses" → "Conta Corrente"

**Step 1:** `page.tsx` carrega lista de clínicas + `fetchContaCorrente(clinicaSelecionada)`.

**Step 2:** Client (funde Repasses + pagamento de implementação — RF-06):
- **Saldo decomposto (RF-10):** 3 números — "Taxa de implementação a amortizar" (`dividaImplementacao.aAmortizar`), "Resultado operacional acumulado" (`operacionalAcumulado`), "Saldo da conta" (`saldo`, verde >0 / vermelho <0) + "Competência acumulada" (referência) + linha-guia ("recebe em dinheiro quando o saldo ficar positivo").
- **Extrato:** tabela (mês, tipo [abertura/resultado/pagamento_implementacao/repasse], valor, saldo) — `formatCurrency`; abertura destacada.
- **Registrar repasse:** form (valor, data, obs) → `registrarRepasse`. Desabilitar/avisar se `!podeRepassar`. `router.refresh()`.
- **Registrar pagamento da implementação (RF-11):** form (valor, mês) → `registrarPagamentoDebito` (já existe em `app/admin/configuracoes/debitos/actions.ts`; surge aqui). Aparece como evento `+` no extrato.
- Botão desfazer por repasse → `desfazerRepasse`.
- A página de config **"Débitos parceiros"** encolhe para só **cadastrar/editar** a taxa (criarDebito/editarDebito); o registro de pagamento migra para cá.

**Step 3: Verificar** `npm run lint` + `npx tsc --noEmit`; smoke `npm run dev` em `/admin/repasses`: saldo −251.311,84, extrato correto, repasse bloqueado (saldo<0).

**Step 4: Commit**
```bash
git add app/admin/repasses/ components/shared/Sidebar.tsx
git commit -m "feat(conta-corrente): UI admin Conta Corrente (saldo, extrato, repasse)"
```

---

## Task 7: UI parceiro — aba "Conta Corrente" no Financeiro

**Files:**
- Modify: `app/parceiro/financeiro/page.tsx`
- Modify: `app/parceiro/financeiro/FinanceiroParceiroClient.tsx`
- Reference: `lib/saldo-parceiro-queries.ts` (RLS filtra a clínica do parceiro)

**Step 1:** `page.tsx` resolve a clínica do parceiro (via RLS/`auth_clinica_id`) e chama `fetchContaCorrente`. Passa ao client.

**Step 2:** Adicionar aba "Conta Corrente" (read-only, transparência total — RF-07): **saldo decomposto (RF-10)** (implementação a amortizar / operacional acumulado / saldo + competência + linha-guia) e o **extrato completo**. Reaproveitar os componentes de saldo/extrato do admin (DRY).

**Step 3: Verificar** logar como parceiro (`supabase/parceiro_cobaia_via_dashboard.md`): vê só a própria clínica, números corretos, sem ação de escrita. `npx tsc --noEmit` limpo.

**Step 4: Commit**
```bash
git add app/parceiro/financeiro/
git commit -m "feat(conta-corrente): aba do parceiro (saldo, extrato, divida)"
```

---

## Task 8: Card "Saldo do parceiro" nos dashboards

**Files:**
- Modify: `app/admin/dashboard/DashboardClient.tsx` (+ query no `app/admin/dashboard/page.tsx` se necessário)
- Modify: dashboard do parceiro (`app/parceiro/dashboard/`)

**Step 1:** **Admin:** lista "Saldo por parceiro" — 1 linha por clínica ativa (nome + saldo, verde/vermelho), cada uma com link para a Conta Corrente daquela clínica (não somar saldos de parceiros distintos). **Parceiro:** card único com saldo decomposto (compacto) + link para a aba Conta Corrente.

**Step 2: Verificar** lint + tsc; saldo bate com a página.

**Step 3: Commit**
```bash
git add app/admin/dashboard/ app/parceiro/dashboard/
git commit -m "feat(conta-corrente): card de saldo nos dashboards"
```

---

## Task 9: Regenerar types + documentação

**Files:**
- Modify: `types/database.types.ts` (regenerar via `mcp__supabase__generate_typescript_types`)
- Modify: `CLAUDE.md` (seção "Conta corrente do parceiro")
- Modify: `decisions.md`

**Step 1:** Regenerar types.

**Step 2:** Documentar em CLAUDE.md: modelo único, saldo de abertura = taxa de implementação, resultado mensal `40%×(recebido−custos)` (mão de obra fixa todo mês), repasse só com saldo>0, RPC `calcular_resultado_mensal_parceiro`, convenção de sinal. Atualizar tabela de arquivos-chave (`lib/saldo-parceiro-queries.ts`, `lib/utils/extrato-parceiro.ts`).

**Step 3:** Registrar a decisão em `decisions.md` (conta única, franquia, BS banca negativos).

**Step 4: Verificar** tsc + lint limpos.

**Step 5: Commit**
```bash
git add types/database.types.ts CLAUDE.md decisions.md
git commit -m "docs(conta-corrente): documenta modelo unico + regenera types"
```

---

## Slicing & ordem

Vertical onde dá: Tasks 1+3+4 são a espinha (cálculo → extrato → query); 2 é a correção retroativa (aplicar após confirmação); 5–8 são UI por superfície (admin, parceiro, dashboard); 9 fecha docs/types. Ordem sugerida: **1 → 3 → 4** (núcleo testável), **2** (retroativo, com confirmação), **5 → 6** (admin), **7** (parceiro), **8** (dashboards), **9** (docs).

## Fora de escopo (confirmar depois — ver PRD §3b/§10)

- Alerta de "quando pagar" quando saldo fica positivo (v2).
- Registro de perda por inadimplência definitiva (v2).
- Vencimento/juros da taxa de implementação (assumido: só amortização por resultado).
- Onboarding multi-clínica (definir `debito_parceiro` de abertura por novo parceiro).

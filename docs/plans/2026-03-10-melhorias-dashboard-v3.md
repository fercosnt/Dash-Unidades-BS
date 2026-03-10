# Melhorias Dashboard V3 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 9 improvements to the Beauty Smile Partners Dashboard as specified in `tasks/melhorias-dashboard-v3.md`.

**Architecture:** Each task is isolated — dashboard filters work via React state + re-fetching server actions; new features (repasses, débitos, comissões) add DB migrations + server actions + pages; the DRE cascata component gets extended for dentist commission.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase (Postgres + RLS), Tailwind CSS, Recharts. No external test runner configured beyond Jest — skip test steps unless `npm test` is set up.

---

## Task 1: Filtros — Meses 2026 fixos + Seletor de Unidade + Auto-recálculo

**Objective:** Replace rolling-12-months selector with fixed Jan–Dec 2026. Add clinic filter dropdown. Remove "Calcular resumo" button from the header (keep it accessible but not prominent).

**Files:**
- Modify: `components/dashboard/PeriodoSelector.tsx`
- Create: `components/dashboard/ClinicaSelector.tsx`
- Modify: `app/admin/dashboard/DashboardClient.tsx`
- Modify: `app/admin/dashboard/page.tsx`
- Modify: `lib/dashboard-queries.ts` (add `clinicaId` param to all fetch functions)

### Step 1.1 — Fix PeriodoSelector to show Jan–Dec 2026

Replace the rolling-12-month generation with a fixed list of all 12 months of 2026. The "Todos os meses" option stays.

```tsx
// components/dashboard/PeriodoSelector.tsx
"use client";

type PeriodoSelectorProps = {
  selectedPeriodo: string;
  onChange: (periodo: string) => void;
  className?: string;
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const OPTIONS_2026 = MONTHS.map((label, i) => ({
  value: `2026-${String(i + 1).padStart(2, "0")}`,
  label: `${label}/2026`,
}));

export function PeriodoSelector({ selectedPeriodo, onChange, className = "" }: PeriodoSelectorProps) {
  return (
    <select
      value={selectedPeriodo}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-all focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 ${className}`}
    >
      <option value="all">Todos os meses</option>
      {OPTIONS_2026.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
```

Run: `npm run build` — should compile without errors.

### Step 1.2 — Create ClinicaSelector component

```tsx
// components/dashboard/ClinicaSelector.tsx
"use client";

type ClinicaSelectorProps = {
  clinicas: { id: string; nome: string }[];
  selectedClinicaId: string;
  onChange: (clinicaId: string) => void;
  className?: string;
};

export function ClinicaSelector({ clinicas, selectedClinicaId, onChange, className = "" }: ClinicaSelectorProps) {
  return (
    <select
      value={selectedClinicaId}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-all focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 ${className}`}
    >
      <option value="">Todas as Unidades</option>
      {clinicas.map((c) => (
        <option key={c.id} value={c.id}>{c.nome}</option>
      ))}
    </select>
  );
}
```

### Step 1.3 — Add `clinicaId` param to dashboard queries

In `lib/dashboard-queries.ts`, every `fetch*` function that queries tables with a `clinica_id` column needs an optional `clinicaId?: string` parameter. When provided and not empty, add `.eq("clinica_id", clinicaId)` to the query.

Functions to update (add `clinicaId?: string` param and filter):
- `fetchKpisAdminV2(mesReferencia, clinicaId?)` — filter `resumo_mensal`, `orcamentos_fechados`, `orcamentos_abertos`, `tratamentos_executados`
- `fetchDreAdmin(mesReferencia, clinicaId?)` — filter `resumo_mensal`
- `fetchRepasseAdmin(mesReferencia, clinicaId?)` — filter `resumo_mensal`, `parcelas_cartao`
- `fetchRankingClinicas(mesReferencia, clinicaId?)` — filter `resumo_mensal`
- `fetchStatusUploads(mesReferencia, clinicaId?)` — filter `clinicas_parceiras` + `upload_batches`
- `fetchChartDataAdmin(mesReferencia, mesesAtras, clinicaId?)` — filter `resumo_mensal`
- `fetchChartLiquidoAdmin(mesReferencia, mesesAtras, clinicaId?)` — filter `resumo_mensal`
- `fetchOrcamentosFechados(mesReferencia, clinicaId?)` — filter `orcamentos_fechados`
- `fetchOrcamentosAbertos(mesReferencia, clinicaId?)` — filter `orcamentos_abertos`
- `fetchVendasEvolucao(mesReferencia, meses, clinicaId?)` — filter `orcamentos_fechados`, `orcamentos_abertos`
- `fetchProcedimentosRanking(mesReferencia, clinicaId?)` — filter `tratamentos_executados`

Pattern to apply in each function (after existing date filters):
```ts
if (clinicaId) query = query.eq("clinica_id", clinicaId);
```

For `fetchStatusUploads`, when `clinicaId` is provided, filter the clinicas list to only that one.

### Step 1.4 — Update DashboardClient

Add `clinicaId` state. Wire `ClinicaSelector`. Change `useEffect` to trigger on both `mes` and `clinicaId` changes. Move the "Calcular resumo" button to a less prominent icon-only button.

Key changes to `DashboardClient.tsx`:

1. Import `ClinicaSelector`
2. Add `const [clinicaId, setClinicaId] = useState("")`
3. Add `ClinicaSelector` next to `PeriodoSelector` in the header
4. Update `useEffect` dependency array to include `clinicaId`
5. Change `useEffect` condition from `if (mes === initialMes) return` to `if (mes === initialMes && clinicaId === "") return`
6. Pass `clinicaId` to all `fetch*` calls inside `useEffect`
7. Pass `clinicaId` to `handleCalcularResumo` — pre-fill `resumoClinicaId` when a clinic is selected

```tsx
// useEffect change:
useEffect(() => {
  if (mes === initialMes && clinicaId === "") return;
  setLoading(true);
  const mesParaGraficos = mes === "all" ? initialMes : mes;
  Promise.all([
    fetchKpisAdminV2(mes, clinicaId || undefined),
    fetchDreAdmin(mes, clinicaId || undefined),
    fetchRepasseAdmin(mes, clinicaId || undefined),
    fetchRankingClinicas(mes, clinicaId || undefined),
    fetchStatusUploads(mes, clinicaId || undefined),
    fetchChartDataAdmin(mesParaGraficos, 12, clinicaId || undefined),
    fetchChartLiquidoAdmin(mesParaGraficos, 12, clinicaId || undefined),
    fetchOrcamentosFechados(mes, clinicaId || undefined),
    fetchOrcamentosAbertos(mes, clinicaId || undefined),
    mes !== "all" ? fetchVendasEvolucao(mes, 3, clinicaId || undefined) : Promise.resolve(initialEvolucao),
    fetchProcedimentosRanking(mes, clinicaId || undefined),
  ]).then(([k, d, rp, r, s, cd, cl, of, oa, ev, proc]) => {
    // ... setState calls unchanged
    setLoading(false);
  });
}, [mes, clinicaId, initialMes, initialEvolucao]);
```

Header JSX layout:
```tsx
<div className="flex items-center gap-3">
  <ClinicaSelector clinicas={clinicas} selectedClinicaId={clinicaId} onChange={setClinicaId} />
  <PeriodoSelector selectedPeriodo={mes} onChange={setMes} />
  {/* small icon button for calcular resumo — keep existing logic */}
</div>
```

### Step 1.5 — Update page.tsx SSR to accept `clinicaId` searchParam

The page currently reads `mes` from `getDefaultMes()` only. Add `clinicaId` from searchParams (keep optional — default to empty string).

```tsx
// app/admin/dashboard/page.tsx
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; clinicaId?: string }>;
}) {
  const params = await searchParams;
  const mes = params.mes ?? getDefaultMes();
  const clinicaId = params.clinicaId ?? "";
  // ... pass clinicaId to all fetch calls and to DashboardClient as initialClinicaId
}
```

Note: The client handles state internally, so the `initialClinicaId` prop just seeds the initial state. All subsequent filter changes are handled client-side without page reload.

### Step 1.6 — Verify and commit

```bash
cd "/Users/fernando/Dash Unidades Beauty Smile"
npm run build
```

Expected: Build succeeds. Commit:
```bash
git add components/dashboard/PeriodoSelector.tsx components/dashboard/ClinicaSelector.tsx app/admin/dashboard/DashboardClient.tsx app/admin/dashboard/page.tsx lib/dashboard-queries.ts
git commit -m "feat: filtros dashboard v3 — meses 2026, seletor de unidade, auto-recálculo"
```

---

## Task 2: Excluir Tratamentos na Revisão de Procedimentos

**Objective:** Add per-row trash icon with inline confirmation + bulk delete via toolbar.

**Files:**
- Modify: `app/admin/upload/revisao/RevisaoProcedimentosClient.tsx`
- Modify: `app/admin/upload/revisao/actions.ts`

### Step 2.1 — Add `excluirTratamentos` server action

In `app/admin/upload/revisao/actions.ts`, add:

```ts
export async function excluirTratamentos(ids: string[]): Promise<{ ok: boolean; error?: string; excluidos?: number }> {
  if (ids.length === 0) return { ok: false, error: "Nenhum item selecionado." };
  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase
    .from("tratamentos_executados")
    .delete()
    .in("id", ids);
  if (error) return { ok: false, error: error.message };
  return { ok: true, excluidos: count ?? ids.length };
}
```

### Step 2.2 — Add delete state to client component

In `RevisaoProcedimentosClient.tsx`:

1. Import `excluirTratamentos` from `./actions`
2. Add state: `const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)`
3. Add bulk delete handler:

```tsx
async function handleExcluirSelecionados() {
  if (selectedIds.size === 0) return;
  const ids = Array.from(selectedIds);
  setLoading(true);
  const result = await excluirTratamentos(ids);
  setLoading(false);
  if (result.ok) {
    setTratamentos((prev) => prev.filter((t) => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
    setMensagem({ tipo: "ok", texto: `${result.excluidos} tratamento(s) excluído(s) com sucesso.` });
    setTimeout(() => setMensagem(null), 4000);
  } else {
    setMensagem({ tipo: "erro", texto: result.error ?? "Erro ao excluir." });
  }
}

async function handleExcluirUm(id: string) {
  setConfirmDeleteId(null);
  setLoading(true);
  const result = await excluirTratamentos([id]);
  setLoading(false);
  if (result.ok) {
    setTratamentos((prev) => prev.filter((t) => t.id !== id));
    setMensagem({ tipo: "ok", texto: "Tratamento excluído." });
    setTimeout(() => setMensagem(null), 3000);
  } else {
    setMensagem({ tipo: "erro", texto: result.error ?? "Erro ao excluir." });
  }
}
```

### Step 2.3 — Add "Excluir selecionados" to toolbar

In the `selectedIds.size > 0` toolbar block, add an "Excluir selecionados" button beside "Vincular selecionados":

```tsx
<button
  type="button"
  onClick={handleExcluirSelecionados}
  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
>
  Excluir selecionados ({selectedIds.size})
</button>
```

### Step 2.4 — Add trash icon + inline confirm to each row

In the table row, replace the `Ação` column to include both "Vincular" and a trash icon. When trash is clicked, show inline "Confirmar?" state for that row only.

Table header: add a 9th column `<th>` for the delete action (no label needed, stays narrow).

In each `<tr>`:
```tsx
<td className="px-4 py-2 text-right">
  {confirmDeleteId === row.id ? (
    <span className="flex items-center gap-1 justify-end">
      <button
        type="button"
        onClick={() => handleExcluirUm(row.id)}
        className="text-xs text-red-600 font-medium hover:underline"
      >
        Confirmar
      </button>
      <button
        type="button"
        onClick={() => setConfirmDeleteId(null)}
        className="text-xs text-neutral-500 hover:underline"
      >
        Cancelar
      </button>
    </span>
  ) : (
    <button
      type="button"
      onClick={() => setConfirmDeleteId(row.id)}
      title="Excluir tratamento"
      className="text-neutral-400 hover:text-red-600 transition-colors"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    </button>
  )}
</td>
```

### Step 2.5 — Verify and commit

```bash
npm run build
git add app/admin/upload/revisao/
git commit -m "feat: excluir tratamentos na revisão — ícone por linha + exclusão em lote"
```

---

## Task 3: Baixa de Repasse Mensal

**Objective:** Create a dedicated repasse management page where admin can record monthly transfers to clinic partners.

**Files:**
- Create: `supabase/migrations/007_repasses.sql`
- Create: `app/admin/repasses/page.tsx`
- Create: `app/admin/repasses/RepassesClient.tsx`
- Create: `app/admin/repasses/actions.ts`
- Create: `lib/repasse-queries.ts`

### Step 3.1 — Create DB migration `007_repasses.sql`

```sql
-- supabase/migrations/007_repasses.sql

CREATE TABLE repasses_mensais (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id     uuid NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia text NOT NULL,           -- YYYY-MM
  valor_repasse  numeric(12,2) NOT NULL,
  data_transferencia date NOT NULL,
  observacao     text,
  status         text NOT NULL DEFAULT 'transferido',
  created_at     timestamptz DEFAULT now(),
  UNIQUE (clinica_id, mes_referencia)
);

-- RLS: only admin can access
ALTER TABLE repasses_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_repasses" ON repasses_mensais
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
```

Apply: `npx supabase db push` (or manually run in Supabase Studio SQL editor).

### Step 3.2 — Create `lib/repasse-queries.ts`

```ts
"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RepasseItem = {
  id: string;
  clinicaId: string;
  clinicaNome: string;
  mesReferencia: string;
  valorRepasse: number;
  dataTransferencia: string;
  observacao: string | null;
  status: string;
};

export type RepassePendente = {
  clinicaId: string;
  clinicaNome: string;
  mesReferencia: string;
  valorCalculado: number;  // from resumo_mensal
};

export async function fetchRepassesPendentes(): Promise<RepassePendente[]> {
  const supabase = await createSupabaseServerClient();
  // Get all resumo_mensal records that don't have a repasse yet
  const { data: resumos } = await supabase
    .from("resumo_mensal")
    .select("clinica_id, mes_referencia, valor_clinica, clinicas_parceiras(nome)")
    .order("mes_referencia", { ascending: false });

  const { data: jaFeitos } = await supabase
    .from("repasses_mensais")
    .select("clinica_id, mes_referencia");

  const feitos = new Set((jaFeitos ?? []).map((r) => `${r.clinica_id}|${(r.mes_referencia as string).slice(0, 7)}`));

  type Row = { clinica_id: string; mes_referencia: string; valor_clinica: number; clinicas_parceiras: { nome: string } | { nome: string }[] | null };

  return ((resumos ?? []) as unknown as Row[])
    .filter((r) => !feitos.has(`${r.clinica_id}|${r.mes_referencia.slice(0, 7)}`))
    .map((r) => {
      const cp = r.clinicas_parceiras;
      const clinica = Array.isArray(cp) ? cp[0] : cp;
      return {
        clinicaId: r.clinica_id,
        clinicaNome: clinica?.nome ?? "—",
        mesReferencia: r.mes_referencia.slice(0, 7),
        valorCalculado: Number(r.valor_clinica ?? 0),
      };
    });
}

export async function fetchRepassesFeitos(): Promise<RepasseItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("repasses_mensais")
    .select("id, clinica_id, mes_referencia, valor_repasse, data_transferencia, observacao, status, clinicas_parceiras(nome)")
    .order("mes_referencia", { ascending: false });

  type Row = { id: string; clinica_id: string; mes_referencia: string; valor_repasse: number; data_transferencia: string; observacao: string | null; status: string; clinicas_parceiras: { nome: string } | { nome: string }[] | null };

  return ((data ?? []) as unknown as Row[]).map((r) => {
    const cp = r.clinicas_parceiras;
    const clinica = Array.isArray(cp) ? cp[0] : cp;
    return {
      id: r.id,
      clinicaId: r.clinica_id,
      clinicaNome: clinica?.nome ?? "—",
      mesReferencia: r.mes_referencia.slice(0, 7),
      valorRepasse: Number(r.valor_repasse),
      dataTransferencia: r.data_transferencia,
      observacao: r.observacao,
      status: r.status,
    };
  });
}
```

### Step 3.3 — Create `app/admin/repasses/actions.ts`

```ts
"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const DarBaixaSchema = z.object({
  clinicaId: z.string().uuid(),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/),
  valorRepasse: z.number().positive(),
  dataTransferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observacao: z.string().optional(),
});

export async function darBaixaRepasse(input: unknown) {
  const parsed = DarBaixaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const { clinicaId, mesReferencia, valorRepasse, dataTransferencia, observacao } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("repasses_mensais").insert({
    clinica_id: clinicaId,
    mes_referencia: `${mesReferencia}-01`,
    valor_repasse: valorRepasse,
    data_transferencia: dataTransferencia,
    observacao: observacao ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

### Step 3.4 — Create `app/admin/repasses/page.tsx` and `RepassesClient.tsx`

**page.tsx:**
```tsx
import { fetchRepassesPendentes, fetchRepassesFeitos } from "@/lib/repasse-queries";
import { RepassesClient } from "./RepassesClient";

export default async function RepassesPage() {
  const [pendentes, feitos] = await Promise.all([
    fetchRepassesPendentes(),
    fetchRepassesFeitos(),
  ]);
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Repasses Mensais</h2>
        <p className="mt-1 text-sm text-white/80">
          Registre a transferência mensal para cada clínica parceira.
        </p>
      </div>
      <RepassesClient pendentes={pendentes} feitos={feitos} />
    </div>
  );
}
```

**RepassesClient.tsx** — A client component with two sections:
1. **Pendentes** — table of `pendentes` with a "Dar baixa" button per row. On click, shows a small inline modal with fields: data da transferência (date input, default today), valor (numeric, default `valorCalculado`), observação (optional textarea). On submit calls `darBaixaRepasse`.
2. **Histórico** — table of `feitos` with: Clínica | Mês ref | Data transferência | Valor | Observação | Status badge.

```tsx
"use client";
import { useState } from "react";
import { darBaixaRepasse } from "./actions";
import type { RepassePendente, RepasseItem } from "@/lib/repasse-queries";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function formatMes(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[Number(mo)-1]}/${y}`;
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function RepassesClient({
  pendentes: initialPendentes,
  feitos: initialFeitos,
}: {
  pendentes: RepassePendente[];
  feitos: RepasseItem[];
}) {
  const [pendentes, setPendentes] = useState(initialPendentes);
  const [feitos, setFeitos] = useState(initialFeitos);
  const [modalItem, setModalItem] = useState<RepassePendente | null>(null);
  const [dataTransferencia, setDataTransferencia] = useState(todayIso());
  const [valor, setValor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok"|"erro"; texto: string } | null>(null);

  function abrirModal(item: RepassePendente) {
    setModalItem(item);
    setDataTransferencia(todayIso());
    setValor(String(item.valorCalculado.toFixed(2)));
    setObservacao("");
    setMsg(null);
  }

  async function handleConfirmar() {
    if (!modalItem) return;
    setSaving(true);
    const result = await darBaixaRepasse({
      clinicaId: modalItem.clinicaId,
      mesReferencia: modalItem.mesReferencia,
      valorRepasse: Number(valor.replace(",", ".")),
      dataTransferencia,
      observacao: observacao || undefined,
    });
    setSaving(false);
    if (result.ok) {
      setPendentes((prev) => prev.filter((p) => !(p.clinicaId === modalItem.clinicaId && p.mesReferencia === modalItem.mesReferencia)));
      setFeitos((prev) => [{
        id: crypto.randomUUID(),
        clinicaId: modalItem.clinicaId,
        clinicaNome: modalItem.clinicaNome,
        mesReferencia: modalItem.mesReferencia,
        valorRepasse: Number(valor.replace(",", ".")),
        dataTransferencia,
        observacao: observacao || null,
        status: "transferido",
      }, ...prev]);
      setModalItem(null);
    } else {
      setMsg({ tipo: "erro", texto: result.error ?? "Erro ao registrar." });
    }
  }

  return (
    <div className="space-y-8">
      {/* Pendentes */}
      <div className="rounded-xl bg-white shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h3 className="text-sm font-bold text-neutral-900">Pendentes de transferência</h3>
        </div>
        {pendentes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-center text-neutral-400">Todos os repasses estão em dia.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Clínica</th>
                <th className="px-4 py-3 text-left font-medium">Mês</th>
                <th className="px-4 py-3 text-right font-medium">Valor calculado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pendentes.map((item) => (
                <tr key={`${item.clinicaId}-${item.mesReferencia}`} className="border-b border-neutral-50 hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-800">{item.clinicaNome}</td>
                  <td className="px-4 py-3 text-neutral-600">{formatMes(item.mesReferencia)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatCurrency(item.valorCalculado)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => abrirModal(item)}
                      className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      Dar baixa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Histórico */}
      <div className="rounded-xl bg-white shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h3 className="text-sm font-bold text-neutral-900">Histórico de repasses</h3>
        </div>
        {feitos.length === 0 ? (
          <p className="px-6 py-8 text-sm text-center text-neutral-400">Nenhum repasse registrado ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Clínica</th>
                <th className="px-4 py-3 text-left font-medium">Mês</th>
                <th className="px-4 py-3 text-left font-medium">Data transferência</th>
                <th className="px-4 py-3 text-right font-medium">Valor</th>
                <th className="px-4 py-3 text-left font-medium">Observação</th>
              </tr>
            </thead>
            <tbody>
              {feitos.map((item) => (
                <tr key={item.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-800">{item.clinicaNome}</td>
                  <td className="px-4 py-3 text-neutral-600">{formatMes(item.mesReferencia)}</td>
                  <td className="px-4 py-3 text-neutral-600">{item.dataTransferencia}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(item.valorRepasse)}</td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">{item.observacao ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal dar baixa */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setModalItem(null)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-neutral-900">Registrar repasse</h3>
            <p className="text-sm text-neutral-600">
              {modalItem.clinicaNome} · {formatMes(modalItem.mesReferencia)}
            </p>
            {msg && (
              <div className={`rounded px-3 py-2 text-sm ${msg.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                {msg.texto}
              </div>
            )}
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-neutral-700">Data da transferência</span>
                <input type="date" value={dataTransferencia} onChange={(e) => setDataTransferencia(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-neutral-700">Valor transferido (R$)</span>
                <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-neutral-700">Observação (opcional)</span>
                <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm resize-none" />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalItem(null)} disabled={saving}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmar} disabled={saving || !valor || !dataTransferencia}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                {saving ? "Salvando..." : "Confirmar repasse"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 3.5 — Add route to sidebar navigation

Find the admin sidebar/nav component and add a link to `/admin/repasses`. Look for the file with existing nav items like `/admin/dashboard`, `/admin/upload`, etc.

```bash
grep -r "admin/upload" "/Users/fernando/Dash Unidades Beauty Smile/app/admin" --include="*.tsx" -l
```

Add nav item with label "Repasses" and href `/admin/repasses`.

### Step 3.6 — Verify and commit

```bash
npm run build
git add app/admin/repasses/ lib/repasse-queries.ts supabase/migrations/007_repasses.sql
git commit -m "feat: página de repasses mensais com dar baixa por mês/clínica"
```

---

## Task 4: Saldo Devedor por Unidade (Franquia Fee)

**Objective:** Track initial partner debt and allow discounting from monthly repasses.

**Files:**
- Create: `supabase/migrations/008_debito_parceiro.sql`
- Create: `app/admin/configuracoes/debitos/` (or section in existing configuracoes)
- Modify: `app/admin/repasses/RepassesClient.tsx` (show saldo devedor in modal)
- Create: `lib/debito-queries.ts`

### Step 4.1 — DB migration `008_debito_parceiro.sql`

```sql
-- supabase/migrations/008_debito_parceiro.sql

CREATE TABLE debito_parceiro (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id  uuid NOT NULL REFERENCES clinicas_parceiras(id),
  descricao   text NOT NULL,
  valor_total numeric(10,2) NOT NULL,
  valor_pago  numeric(10,2) NOT NULL DEFAULT 0,
  data_inicio date NOT NULL,
  status      text NOT NULL DEFAULT 'ativo',   -- ativo | quitado
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE abatimentos_debito (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debito_id      uuid NOT NULL REFERENCES debito_parceiro(id),
  mes_referencia text NOT NULL,        -- YYYY-MM
  valor_abatido  numeric(10,2) NOT NULL,
  repasse_id     uuid REFERENCES repasses_mensais(id),
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE debito_parceiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE abatimentos_debito ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_debito" ON debito_parceiro
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "parceiro_read_own_debito" ON debito_parceiro
  FOR SELECT TO authenticated
  USING (clinica_id = auth_clinica_id());

CREATE POLICY "admin_all_abatimentos" ON abatimentos_debito
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "parceiro_read_own_abatimentos" ON abatimentos_debito
  FOR SELECT TO authenticated
  USING (debito_id IN (
    SELECT id FROM debito_parceiro WHERE clinica_id = auth_clinica_id()
  ));
```

### Step 4.2 — Create `lib/debito-queries.ts`

```ts
"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DebitoItem = {
  id: string;
  clinicaId: string;
  clinicaNome: string;
  descricao: string;
  valorTotal: number;
  valorPago: number;
  saldoRestante: number;
  dataInicio: string;
  status: string;
};

export async function fetchDebitosAtivos(): Promise<DebitoItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("debito_parceiro")
    .select("id, clinica_id, descricao, valor_total, valor_pago, data_inicio, status, clinicas_parceiras(nome)")
    .eq("status", "ativo")
    .order("data_inicio", { ascending: false });

  type Row = { id: string; clinica_id: string; descricao: string; valor_total: number; valor_pago: number; data_inicio: string; status: string; clinicas_parceiras: { nome: string } | { nome: string }[] | null };

  return ((data ?? []) as unknown as Row[]).map((r) => {
    const cp = r.clinicas_parceiras;
    const clinica = Array.isArray(cp) ? cp[0] : cp;
    return {
      id: r.id,
      clinicaId: r.clinica_id,
      clinicaNome: clinica?.nome ?? "—",
      descricao: r.descricao,
      valorTotal: Number(r.valor_total),
      valorPago: Number(r.valor_pago),
      saldoRestante: Number(r.valor_total) - Number(r.valor_pago),
      dataInicio: r.data_inicio,
      status: r.status,
    };
  });
}

export async function fetchDebitoPorClinica(clinicaId: string): Promise<DebitoItem | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("debito_parceiro")
    .select("id, clinica_id, descricao, valor_total, valor_pago, data_inicio, status")
    .eq("clinica_id", clinicaId)
    .eq("status", "ativo")
    .maybeSingle();

  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    clinicaId: r.clinica_id as string,
    clinicaNome: "",
    descricao: r.descricao as string,
    valorTotal: Number(r.valor_total),
    valorPago: Number(r.valor_pago),
    saldoRestante: Number(r.valor_total) - Number(r.valor_pago),
    dataInicio: r.data_inicio as string,
    status: r.status as string,
  };
}
```

### Step 4.3 — Server actions for débito

Create `app/admin/configuracoes/debitos/actions.ts` (or add to a central actions file):

```ts
"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const CriarDebitoSchema = z.object({
  clinicaId: z.string().uuid(),
  descricao: z.string().min(1),
  valorTotal: z.number().positive(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function criarDebito(input: unknown) {
  const parsed = CriarDebitoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("debito_parceiro").insert({
    clinica_id: parsed.data.clinicaId,
    descricao: parsed.data.descricao,
    valor_total: parsed.data.valorTotal,
    data_inicio: parsed.data.dataInicio,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

### Step 4.4 — Débito management page

Create `app/admin/configuracoes/debitos/page.tsx` — server component that fetches all active débitos and renders a `DebitosClient` with a form to add new débito + list of existing ones with progress bars.

The progress bar shows `(valorPago / valorTotal) * 100`%.

**Card structure per débito:**
```
[Clínica Nome]
Franquia Fee - Contrato 2025
Total: R$ 250.000  |  Pago: R$ 12.500  |  Saldo: R$ 237.500
[████░░░░░░░░░░░░░░░░░░░░] 5%
```

### Step 4.5 — Integrate saldo devedor in Repasse modal

In `RepassesClient.tsx`, when opening the "Dar baixa" modal, fetch the débito for that clinica. Show it in the modal with an optional "Abater do repasse" amount field.

Update `darBaixaRepasse` server action to accept optional `abatimento` param:
- If `abatimento > 0`, create a record in `abatimentos_debito` and update `valor_pago` in `debito_parceiro`
- Reduce the net `valor_repasse` by the abatimento

Since this requires transactional updates, use a Supabase RPC function or sequential updates with error handling.

### Step 4.6 — Verify and commit

```bash
npm run build
git add supabase/migrations/008_debito_parceiro.sql lib/debito-queries.ts app/admin/configuracoes/debitos/
git commit -m "feat: saldo devedor por unidade — débito, abatimentos e gestão"
```

---

## Task 5: Comissão da Dentista — Tiers + Baixa + DRE

**Objective:** Track dentist commissions per clinic/month with configurable tier thresholds, automatic calculation display, and payment recording.

**Files:**
- Create: `supabase/migrations/009_comissoes_dentista.sql`
- Create: `lib/comissao-dentista-queries.ts`
- Create: `app/admin/comissoes-dentista/page.tsx`
- Create: `app/admin/comissoes-dentista/ComissoesDentistaClient.tsx`
- Create: `app/admin/comissoes-dentista/actions.ts`
- Modify: `components/dashboard/DreCascata.tsx` (add comissão dentista line)
- Modify: `types/dashboard.types.ts` (add comissaoDevida to DreAdminData)

### Step 5.1 — DB migration `009_comissoes_dentista.sql`

```sql
-- supabase/migrations/009_comissoes_dentista.sql

CREATE TABLE config_comissao_dentista (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier1_limite     int NOT NULL DEFAULT 7,
  tier1_percentual numeric(5,2) NOT NULL DEFAULT 2.00,
  tier2_limite     int NOT NULL DEFAULT 12,
  tier2_percentual numeric(5,2) NOT NULL DEFAULT 2.50,
  tier3_percentual numeric(5,2) NOT NULL DEFAULT 3.00,
  vigencia_inicio  date NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim     date,
  created_at       timestamptz DEFAULT now()
);

-- Insert default config
INSERT INTO config_comissao_dentista (tier1_limite, tier1_percentual, tier2_limite, tier2_percentual, tier3_percentual)
VALUES (7, 2.00, 12, 2.50, 3.00);

CREATE TABLE comissoes_dentista (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id       uuid NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia   text NOT NULL,
  qtde_vendas      int NOT NULL,
  tier_aplicado    int NOT NULL,
  percentual       numeric(5,2) NOT NULL,
  base_calculo     numeric(12,2) NOT NULL,
  valor_comissao   numeric(12,2) NOT NULL,
  status           text NOT NULL DEFAULT 'pendente',
  data_pagamento   date,
  observacao       text,
  config_id        uuid REFERENCES config_comissao_dentista(id),
  created_at       timestamptz DEFAULT now(),
  UNIQUE (clinica_id, mes_referencia)
);

ALTER TABLE config_comissao_dentista ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes_dentista ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_config_comissao_dentista" ON config_comissao_dentista
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_all_comissoes_dentista" ON comissoes_dentista
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
```

### Step 5.2 — Create `lib/comissao-dentista-queries.ts`

Functions:
- `fetchConfigComissaoDentista()` — returns current tier config (vigencia_fim IS NULL)
- `fetchComissoesDentista(mes?, status?)` — list with clinica join
- `calcularComissaoDentista(clinicaId, mes)` — compute and upsert into comissoes_dentista:
  1. Count orcamentos_fechados for that clinic/month
  2. Get current tier config
  3. Determine tier based on qtde_vendas
  4. Get faturamento_bruto from resumo_mensal
  5. Upsert record in comissoes_dentista

```ts
export async function calcularComissaoDentista(clinicaId: string, mes: string) {
  const supabase = await createSupabaseServerClient();
  const start = `${mes}-01`;
  const [y, m] = mes.split("-").map(Number);
  const end = `${mes}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  const [configRes, vendas, resumo] = await Promise.all([
    supabase.from("config_comissao_dentista").select("*").is("vigencia_fim", null).maybeSingle(),
    supabase.from("orcamentos_fechados").select("id").eq("clinica_id", clinicaId).gte("mes_referencia", start).lte("mes_referencia", end),
    supabase.from("resumo_mensal").select("faturamento_bruto").eq("clinica_id", clinicaId).gte("mes_referencia", start).lte("mes_referencia", end).maybeSingle(),
  ]);

  const config = configRes.data;
  if (!config) return { ok: false, error: "Configuração de tiers não encontrada." };

  const qtdeVendas = (vendas.data ?? []).length;
  const faturamentoBruto = Number(resumo.data?.faturamento_bruto ?? 0);

  let tierAplicado = 3;
  let percentual = config.tier3_percentual;
  if (qtdeVendas <= config.tier1_limite) { tierAplicado = 1; percentual = config.tier1_percentual; }
  else if (qtdeVendas <= config.tier2_limite) { tierAplicado = 2; percentual = config.tier2_percentual; }

  const valorComissao = faturamentoBruto * (Number(percentual) / 100);

  const { error } = await supabase.from("comissoes_dentista").upsert({
    clinica_id: clinicaId,
    mes_referencia: start,
    qtde_vendas: qtdeVendas,
    tier_aplicado: tierAplicado,
    percentual,
    base_calculo: faturamentoBruto,
    valor_comissao: valorComissao,
    config_id: config.id,
  }, { onConflict: "clinica_id,mes_referencia" });

  if (error) return { ok: false, error: error.message };
  return { ok: true, valorComissao, tier: tierAplicado };
}
```

### Step 5.3 — Create actions for dar baixa em comissão dentista

`app/admin/comissoes-dentista/actions.ts`:
```ts
export async function darBaixaComissaoDentista(id: string, dataPagamento: string, observacao?: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("comissoes_dentista")
    .update({ status: "pago", data_pagamento: dataPagamento, observacao: observacao ?? null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

### Step 5.4 — Create page and client

`app/admin/comissoes-dentista/page.tsx` — SSR page, fetches comissoes list + config.

`ComissoesDentistaClient.tsx` — Table with columns: Clínica | Mês | Qtde vendas | Tier | % | Valor | Status | Ação. "Dar baixa" button opens inline modal with date input.

### Step 5.5 — Update DRE to show comissão dentista

In `types/dashboard.types.ts`, add to `DreAdminData`:
```ts
comissaoDentista: number;
resultadoLiquidoBS: number;
```

In `lib/dashboard-queries.ts`, update `fetchDreAdmin` to also query `comissoes_dentista` for the period and sum `valor_comissao`. Add to the return:
```ts
comissaoDentista: sumFromComissoes,
resultadoLiquidoBS: valorBeautySmile - sumFromComissoes,
```

In `components/dashboard/DreCascata.tsx`, add after the Beauty Smile split row:
```tsx
<DreRow
  label="(-) Comissão Dentista"
  value={data.comissaoDentista}
  base={data.faturamentoBruto}
  negative
  indent
/>
<DreRow
  label="= Resultado Líquido BS"
  value={data.resultadoLiquidoBS}
  base={data.faturamentoBruto}
  highlight
  indent
/>
```

### Step 5.6 — Verify and commit

```bash
npm run build
git add supabase/migrations/009_comissoes_dentista.sql lib/comissao-dentista-queries.ts app/admin/comissoes-dentista/ components/dashboard/DreCascata.tsx types/dashboard.types.ts
git commit -m "feat: comissão dentista — tiers, cálculo, dar baixa, DRE cascata"
```

---

## Task 6: Página de Comissões Médicos Indicadores

**Objective:** List and record payments for doctor referral commissions.

**Files:**
- Create: `supabase/migrations/010_pagamentos_comissao_medicos.sql`
- Create: `lib/comissao-medicos-queries.ts`
- Create: `app/admin/comissoes/page.tsx`
- Create: `app/admin/comissoes/ComissoesMedicosClient.tsx`
- Create: `app/admin/comissoes/actions.ts`

### Step 6.1 — DB migration

```sql
-- supabase/migrations/010_pagamentos_comissao_medicos.sql

CREATE TABLE pagamentos_comissao (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_indicador_id  uuid NOT NULL REFERENCES medicos_indicadores(id),
  clinica_id           uuid NOT NULL REFERENCES clinicas_parceiras(id),
  mes_referencia       text NOT NULL,
  valor_comissao       numeric(10,2) NOT NULL,
  status               text NOT NULL DEFAULT 'pendente',
  data_pagamento       date,
  observacao           text,
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE pagamentos_comissao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_pagamentos_comissao" ON pagamentos_comissao
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
```

### Step 6.2 — Queries and actions

`lib/comissao-medicos-queries.ts` — fetch list joining medicos_indicadores + clinicas_parceiras, filter by mes/clinica/medico/status.

`app/admin/comissoes/actions.ts` — `darBaixaComissao(id, dataPagamento, observacao?)` updates status.

### Step 6.3 — Page and client

`page.tsx` + `ComissoesMedicosClient.tsx` — Table with KPIs (total a pagar no mês, total pago) + filters (mês, clínica, médico, status) + dar baixa button per row.

### Step 6.4 — Verify and commit

```bash
npm run build
git add supabase/migrations/010_pagamentos_comissao_medicos.sql lib/comissao-medicos-queries.ts app/admin/comissoes/
git commit -m "feat: página de comissões médicos indicadores com dar baixa"
```

---

## Task 7: Aba Vendas — Tabela de Tratamentos Vendidos

**Objective:** Add a treatments breakdown table in the Vendas tab showing which treatments are being sold and their revenue share.

**Files:**
- Modify: `lib/dashboard-queries.ts` (add `fetchTratamentosVendidos`)
- Create: `components/dashboard/TabelaTratamentosVendidos.tsx`
- Modify: `app/admin/dashboard/DashboardClient.tsx` (add to Vendas tab)
- Modify: `app/admin/dashboard/page.tsx` (add initial fetch)
- Modify: `types/dashboard.types.ts` (add `TratamentoVendidoItem` type)

### Step 7.1 — Add type

In `types/dashboard.types.ts`:
```ts
export type TratamentoVendidoItem = {
  tratamentoNome: string;
  qtdeVendida: number;
  valorTotal: number;
  percentualFaturamento: number;
};
```

### Step 7.2 — Add query function

```ts
export async function fetchTratamentosVendidos(
  mesReferencia: string,
  clinicaId?: string
): Promise<TratamentoVendidoItem[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("orcamentos_fechados")
    .select("procedimento_nome, valor_total");

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    query = query.gte("mes_referencia", start).lte("mes_referencia", end);
  }
  if (clinicaId) query = query.eq("clinica_id", clinicaId);

  const { data, error } = await query;
  if (error) return [];

  const grouped: Record<string, { qtde: number; valor: number }> = {};
  let totalValor = 0;
  (data ?? []).forEach((r: Record<string, unknown>) => {
    const nome = (r.procedimento_nome as string) ?? "Sem nome";
    if (!grouped[nome]) grouped[nome] = { qtde: 0, valor: 0 };
    grouped[nome]!.qtde++;
    grouped[nome]!.valor += Number(r.valor_total ?? 0);
    totalValor += Number(r.valor_total ?? 0);
  });

  return Object.entries(grouped)
    .map(([nome, v]) => ({
      tratamentoNome: nome,
      qtdeVendida: v.qtde,
      valorTotal: v.valor,
      percentualFaturamento: totalValor > 0 ? (v.valor / totalValor) * 100 : 0,
    }))
    .sort((a, b) => b.valorTotal - a.valorTotal);
}
```

Note: `orcamentos_fechados` has a `procedimento_nome` column based on the XLSX parser. Verify this column exists in the actual table schema before running.

### Step 7.3 — Create `TabelaTratamentosVendidos` component

```tsx
// components/dashboard/TabelaTratamentosVendidos.tsx
"use client";
import type { TratamentoVendidoItem } from "@/types/dashboard.types";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function PctBadge({ pct }: { pct: number }) {
  const color = pct >= 20 ? "bg-success-100 text-success-800" : pct >= 10 ? "bg-amber-100 text-amber-800" : "bg-neutral-100 text-neutral-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {pct.toFixed(1)}%
    </span>
  );
}

export function TabelaTratamentosVendidos({ data }: { data: TratamentoVendidoItem[] }) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">Nenhum tratamento vendido neste período.</p>;
  }
  return (
    <div className="rounded-xl bg-white shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100">
        <h3 className="text-sm font-bold text-neutral-900">Tratamentos Vendidos</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-xs text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">Tratamento</th>
              <th className="px-4 py-3 text-right font-medium">Qtde</th>
              <th className="px-4 py-3 text-right font-medium">Valor Total</th>
              <th className="px-4 py-3 text-center font-medium">% Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.tratamentoNome} className="border-b border-neutral-50 hover:bg-neutral-50">
                <td className="px-4 py-3 text-neutral-800">{item.tratamentoNome}</td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{item.qtdeVendida}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-neutral-900">
                  {formatCurrency(item.valorTotal)}
                </td>
                <td className="px-4 py-3 text-center">
                  <PctBadge pct={item.percentualFaturamento} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Step 7.4 — Integrate in DashboardClient

Add `tratamentosVendidos` state and fetch in both SSR (page.tsx) and client useEffect. In the Vendas tab, add `<TabelaTratamentosVendidos data={tratamentosVendidos} />` below the existing charts.

### Step 7.5 — Verify and commit

```bash
npm run build
git add components/dashboard/TabelaTratamentosVendidos.tsx lib/dashboard-queries.ts app/admin/dashboard/ types/dashboard.types.ts
git commit -m "feat: aba vendas — tabela de tratamentos vendidos com % faturamento"
```

---

## Task 8: Exportar Relatório PDF

**Objective:** Generate a monthly PDF report for the clinic partner summarizing the financial period.

**Files:**
- Create: `app/api/relatorio/pdf/route.ts`
- Create: `components/pdf/RelatorioPDF.tsx`

### Step 8.1 — Install react-pdf renderer

```bash
cd "/Users/fernando/Dash Unidades Beauty Smile"
npm install @react-pdf/renderer
```

### Step 8.2 — Create PDF component

`components/pdf/RelatorioPDF.tsx` — A `@react-pdf/renderer` document with:
1. Header: Beauty Smile logo (if available) + clinic name + period
2. Financial Summary (DRE cascata as table rows)
3. Repasse do Mês (base caixa)
4. Top Procedimentos (table)
5. Top Tratamentos Vendidos (table)
6. Footer with generation date

Note: `@react-pdf/renderer` uses its own style system — no Tailwind. Use inline `StyleSheet.create`.

### Step 8.3 — Create API route

`app/api/relatorio/pdf/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { RelatorioPDF } from "@/components/pdf/RelatorioPDF";
// ... fetch all data for the given clinica + mes
// return PDF as buffer
```

### Step 8.4 — Add "Exportar PDF" button in DashboardClient

When a clinica is selected and mes is not "all", show button that opens the PDF URL in a new tab.

### Step 8.5 — Verify and commit

```bash
npm run build
git add components/pdf/ app/api/relatorio/
git commit -m "feat: exportar relatório PDF mensal por clínica"
```

---

## Task 9: Gráfico Evolução por Tratamento (Low Priority)

**Objective:** Line chart in Vendas tab showing top-5 treatments over the last 3–6 months.

**Files:**
- Create: `components/dashboard/ChartTratamentosEvolucao.tsx`
- Modify: `lib/dashboard-queries.ts` (add `fetchTratamentosEvolucao`)
- Modify: `app/admin/dashboard/DashboardClient.tsx`
- Modify: `app/admin/dashboard/page.tsx`
- Modify: `types/dashboard.types.ts`

### Step 9.1 — Add type and query

```ts
export type TratamentoEvolucaoPoint = {
  mesReferencia: string;
  [tratamento: string]: number | string;  // dynamic keys per treatment
};
```

Query: fetch `orcamentos_fechados` for last 6 months, group by procedimento_nome + mes, get top-5 by total value, return data shaped for Recharts LineChart.

### Step 9.2 — Create chart component

Recharts `LineChart` with:
- X axis: month labels
- Y axis: toggle between Quantidade and Valor (React state)
- One `<Line>` per top-5 treatment, each with a distinct color
- Legend

### Step 9.3 — Integrate

Add below `TabelaTratamentosVendidos` in Vendas tab.

### Step 9.4 — Verify and commit

```bash
npm run build
git commit -m "feat: aba vendas — gráfico de evolução por tratamento (top 5, 6 meses)"
```

---

## Navigation — Ensure new pages are linked

After Tasks 3-7, find the admin navigation/sidebar and add links for:
- `/admin/repasses` → "Repasses"
- `/admin/comissoes-dentista` → "Comissões Dentista"
- `/admin/comissoes` → "Comissões Médicos"

Use the sidebar component located with:
```bash
grep -r "href.*admin/dashboard" "/Users/fernando/Dash Unidades Beauty Smile/app" --include="*.tsx" -l
```

---

## Final Verification

```bash
cd "/Users/fernando/Dash Unidades Beauty Smile"
npm run build
npm run lint
```

All builds should succeed before marking implementation complete.

---

## Addendum — Revisões pós-teste (2026-03-10)

> Feedback coletado após rodar Tasks 3, 4 e 5 em ambiente local.
> Tasks 1 e 2 já estavam OK. As revisões abaixo substituem/complementam as tasks originais.

---

### Revisão Task 3 — Repasses: Desfazer + Abatimento de Débito

**Problema:** Sem forma de reverter um repasse lançado por engano. Sem integração com débito parceiro no modal.

**Mudanças:**

#### 3.R1 — Desfazer repasse (novo)

Server action `desfazerRepasse(id: string)`:
1. Busca `abatimentos_debito` vinculados ao repasse (`repasse_id = id`)
2. Para cada abatimento encontrado:
   - Deleta o registro de `abatimentos_debito`
   - Recalcula `valor_pago` no `debito_parceiro` (SUM dos abatimentos restantes)
   - Se `valor_pago < valor_total`, restaura `status = 'ativo'`
3. Deleta o registro de `repasses_mensais`

No histórico de repasses, adicionar ícone de lixeira por linha. Ao clicar, exibe confirmação inline "Desfazer repasse?" → Confirmar / Cancelar.

#### 3.R2 — Abatimento de débito no modal "Dar baixa"

A página de repasses já carrega `debitosAtivos` (novo fetch em `page.tsx`). O `RepassesClient` recebe `debitosAtivos: DebitoItem[]`.

Ao abrir o modal "Dar baixa", se `debitosAtivos` contém um débito para a `clinicaId` do item selecionado:
- Mostrar seção "Esta clínica tem débito ativo"
- Campo "Abater do repasse: R$ [input]" — max = min(saldoRestante, valorRepasse)
- Helper text: "Saldo devedor: R$ X. O valor abatido será deduzido do repasse líquido."

`darBaixaRepasse` atualizado para aceitar `abatimento?: number`:
- Insere repasse com `valor_repasse = valorRepasse` (bruto — o que foi calculado)
- Se `abatimento > 0`:
  - Busca `debito_parceiro` ativo da clínica
  - Insere em `abatimentos_debito` (debito_id, mes_referencia, valor_abatido, repasse_id)
  - Atualiza `debito_parceiro.valor_pago += abatimento`
  - Se `valor_pago >= valor_total`, seta `status = 'quitado'`

**Arquivos a modificar:**
- `app/admin/repasses/actions.ts` — adicionar `desfazerRepasse`, atualizar `darBaixaRepasse`
- `app/admin/repasses/RepassesClient.tsx` — ícone desfazer no histórico, seção débito no modal
- `app/admin/repasses/page.tsx` — fetch de `debitosAtivos`
- `lib/repasse-queries.ts` — sem mudança (usar `fetchDebitosAtivos` de `lib/debito-queries.ts`)

---

### Revisão Task 4 — Débitos: Pagamento Parcial + Histórico

**Problema:** Botão "Quitar" não permite pagamento parcial. Sem histórico de abatimentos por débito.

**Mudanças:**

#### 4.R1 — Substituir "Quitar" por "Registrar pagamento" (modal)

Modal com:
- Valor (R$) — input numérico, máximo = saldo restante — com hint "Saldo: R$ X"
- Observação (opcional)
- Se o valor informado ≥ saldo restante: checkbox "Marcar como quitado" (marcado por padrão)

Server action `registrarPagamentoDebito(debitoId, valor, observacao?)`:
1. Busca `debito_parceiro` (valor_pago, valor_total atual)
2. Calcula novo `valor_pago = valor_pago + valor`
3. Insere em `abatimentos_debito` (sem `repasse_id`, `mes_referencia` = mês atual)
4. Atualiza `debito_parceiro.valor_pago`; se `valor_pago >= valor_total`, seta `status = 'quitado'`

#### 4.R2 — Histórico de pagamentos por débito

No card do débito, abaixo da barra de progresso, adicionar seção expansível "Ver histórico de abatimentos":
- Tabela: Data | Valor | Origem (Direto / Repasse mês X) | Observação
- "Origem" é determinada pela presença de `repasse_id` (se não nulo, exibir "Repasse Jan/2026")

Query `fetchAbatimentosPorDebito(debitoId)` — retorna `abatimentos_debito` ordenados por `created_at desc`, com join em `repasses_mensais(mes_referencia)`.

**Arquivos a modificar:**
- `app/admin/configuracoes/debitos/actions.ts` — adicionar `registrarPagamentoDebito`
- `app/admin/configuracoes/debitos/DebitosClient.tsx` — modal de pagamento, histórico expansível
- `lib/debito-queries.ts` — adicionar `fetchAbatimentosPorDebito`

---

### Revisão Task 5 — Dentistas: Novo modelo com cadastro e "Calcular Comissão"

**Problema:** Task 5 original não tinha entidade Dentista. A comissão era por clínica sem vínculo com pessoa. Modelo remodelado para ter dentistas cadastrados e vinculados a clínicas.

**Regra de negócio confirmada:** Uma clínica tem exatamente 1 dentista ativo. A comissão é calculada por dentista (= por clínica) por mês. O cálculo usa faturamento bruto + qtde orçamentos fechados da clínica para determinar o tier.

#### 5.R1 — Migration `010_dentistas.sql`

```sql
CREATE TABLE dentistas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas_parceiras(id),
  nome       text NOT NULL,
  email      text,
  telefone   text,
  ativo      boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Garante 1 dentista ativo por clínica
CREATE UNIQUE INDEX idx_dentistas_clinica_ativo
  ON dentistas (clinica_id) WHERE ativo = true;

ALTER TABLE dentistas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_dentistas" ON dentistas
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Adiciona dentista_id à tabela de comissões (nullable para compatibilidade)
ALTER TABLE comissoes_dentista
  ADD COLUMN dentista_id uuid REFERENCES dentistas(id);
```

Aplicar no Supabase Studio (SQL Editor) — arquivo `supabase/migrations/010_dentistas.sql`.

#### 5.R2 — Página `/admin/configuracoes/dentistas`

CRUD simples:
- Lista todos os dentistas com colunas: Nome | Clínica | Email | Status
- Formulário "Adicionar": nome (text), clinica (select das ativas), email (optional), telefone (optional)
- Botão "Desativar" por linha — seta `ativo = false` (remove o unique index, permite cadastrar novo)
- Se clínica já tem dentista ativo, aviso "Já existe dentista ativo para esta clínica. Desativar primeiro."

**Arquivos:** `lib/dentista-queries.ts`, `app/admin/configuracoes/dentistas/page.tsx`, `DentistasClient.tsx`, `actions.ts`

Adicionar no sidebar (Configurações): `{ href: "/admin/configuracoes/dentistas", label: "Dentistas" }`

#### 5.R3 — Página `/admin/comissoes-dentista` remodelada

**Seção superior — "Calcular comissão":**
```
[Dentista ▼]  [Mês ▼]  [Calcular comissão]
```
- Dentista dropdown: lista dentistas ativos com nome + clínica (ex: "Dra. Silva — Clínica Hirata")
- Mês dropdown: Jan–Dez 2026 (reutiliza OPTIONS_2026)
- Ao clicar "Calcular": chama `calcularComissaoDentista(dentistaId, mes)` — que internamente usa `clinica_id` do dentista

`calcularComissaoDentista(dentistaId, mes)` atualizado:
1. Busca `dentistas` por `dentistaId` → obtém `clinica_id`
2. Conta `orcamentos_fechados` da clínica no mês
3. Pega `faturamento_bruto` de `resumo_mensal` da clínica
4. Determina tier + percentual via `config_comissao_dentista`
5. Faz upsert em `comissoes_dentista` com `dentista_id = dentistaId`
6. Retorna tier aplicado + valor calculado — exibe toast de confirmação

**Tabela de comissões:**
Colunas: Dentista | Clínica | Mês | Qtde Vendas | Tier | % | Valor | Status | Ação

Ação "Dar baixa" → modal com data + observação (igual ao atual, sem mudanças).

**Arquivos a modificar:**
- `supabase/migrations/010_dentistas.sql` — criar
- `lib/dentista-queries.ts` — criar (`fetchDentistas`, `criarDentista`, `desativarDentista`)
- `lib/comissao-dentista-queries.ts` — atualizar `calcularComissaoDentista` para aceitar `dentistaId` em vez de `clinicaId`; atualizar `fetchComissoesDentista` para incluir join com `dentistas`
- `app/admin/configuracoes/dentistas/` — criar (page, client, actions)
- `app/admin/comissoes-dentista/ComissoesDentistaClient.tsx` — adicionar seção "Calcular comissão" + coluna Dentista na tabela
- `app/admin/comissoes-dentista/actions.ts` — atualizar export de `calcularComissaoDentista`
- `app/admin/layout.tsx` — adicionar link Dentistas em Configurações

---

### Ordem de implementação das revisões

1. Migration `010_dentistas.sql` (aplicar no Studio)
2. `lib/dentista-queries.ts` + página `/admin/configuracoes/dentistas`
3. Atualizar `lib/comissao-dentista-queries.ts` + `/admin/comissoes-dentista/`
4. Melhorias Task 3 (desfazer repasse + abatimento no modal)
5. Melhorias Task 4 (pagamento parcial + histórico abatimentos)
6. Build + commit por grupo

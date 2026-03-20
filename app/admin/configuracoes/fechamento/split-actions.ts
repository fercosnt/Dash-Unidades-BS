"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import {
  splitOrcamento,
  type ProcedimentoRef,
  type OrcamentoParaSplit,
  type SplitItem,
} from "@/lib/utils/split-orcamento";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/utils/date-helpers";

// ---------- Types ----------

export type SplitStats = {
  totalOrcamentos: number;
  splitados: number;
  pendentes: number;
  comUnmatched: number;
};

export type ItemOrcamentoRow = {
  id: string;
  orcamento_fechado_id: string;
  procedimento_id: string | null;
  procedimento_nome_original: string;
  quantidade: number;
  valor_tabela: number;
  valor_proporcional: number;
  categoria: string | null;
  match_status: string;
};

export type OrcamentoReviewRow = {
  id: string;
  paciente_nome: string;
  procedimentos_texto: string | null;
  valor_total: number;
  valor_bruto: number | null;
  desconto_reais: number | null;
  desconto_percentual: number | null;
  split_status: string | null;
  itens: ItemOrcamentoRow[];
  soma_itens: number;
  divergencia: number;
};

// ---------- Helpers ----------

async function fetchProcedimentosRef(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<ProcedimentoRef[]> {
  const { data, error } = await supabase
    .from("procedimentos")
    .select("id, nome, codigo_clinicorp, valor_tabela, categoria")
    .eq("ativo", true);
  if (error) throw new Error(error.message);
  return (data ?? []) as ProcedimentoRef[];
}

// ---------- Actions ----------

/** Processar split de todos orcamentos do mes que ainda nao foram splitados */
export async function splitOrcamentosMes(
  mesReferencia: string,
  clinicaId?: string
): Promise<{ processados: number; matched: number; unmatched: number }> {
  const { supabase } = await requireAdmin();

  const start = firstDayOfMonth(mesReferencia);
  const end = lastDayOfMonth(mesReferencia);

  let query = supabase
    .from("orcamentos_fechados")
    .select("id, clinica_id, procedimentos_texto, valor_total, valor_bruto, desconto_reais")
    .is("split_status", null)
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);

  if (clinicaId) query = query.eq("clinica_id", clinicaId);

  const { data: orcamentos, error: oErr } = await query;
  if (oErr) throw new Error(oErr.message);
  if (!orcamentos?.length) return { processados: 0, matched: 0, unmatched: 0 };

  const procedimentos = await fetchProcedimentosRef(supabase);

  let totalMatched = 0;
  let totalUnmatched = 0;
  const allInserts: Array<{
    orcamento_fechado_id: string;
    clinica_id: string;
    procedimento_id: string | null;
    procedimento_nome_original: string;
    quantidade: number;
    valor_tabela: number;
    valor_proporcional: number;
    categoria: string | null;
    match_status: string;
  }> = [];

  for (const orc of orcamentos as OrcamentoParaSplit[]) {
    const result = splitOrcamento(orc, procedimentos);
    for (const item of result.items) {
      allInserts.push({
        orcamento_fechado_id: orc.id,
        clinica_id: orc.clinica_id,
        procedimento_id: item.procedimento_id,
        procedimento_nome_original: item.procedimento_nome_original,
        quantidade: 1,
        valor_tabela: item.valor_tabela,
        valor_proporcional: item.valor_proporcional,
        categoria: item.categoria,
        match_status: item.match_status,
      });
      if (item.match_status === "auto") totalMatched++;
      else totalUnmatched++;
    }
  }

  // Bulk insert itens
  if (allInserts.length > 0) {
    const { error: iErr } = await supabase
      .from("itens_orcamento")
      .insert(allInserts);
    if (iErr) throw new Error(iErr.message);
  }

  // Update split_status
  const ids = (orcamentos as OrcamentoParaSplit[]).map((o) => o.id);
  const { error: uErr } = await supabase
    .from("orcamentos_fechados")
    .update({ split_status: "auto" })
    .in("id", ids);
  if (uErr) throw new Error(uErr.message);

  revalidatePath("/admin/configuracoes/fechamento");
  revalidatePath("/admin/fechamento");
  return {
    processados: orcamentos.length,
    matched: totalMatched,
    unmatched: totalUnmatched,
  };
}

/** Buscar stats de split para um mes */
export async function fetchSplitStats(mesReferencia: string): Promise<SplitStats> {
  const supabase = await createSupabaseServerClient();
  const start = firstDayOfMonth(mesReferencia);
  const end = lastDayOfMonth(mesReferencia);

  const { data, error } = await supabase
    .from("orcamentos_fechados")
    .select("id, split_status")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);

  if (error) return { totalOrcamentos: 0, splitados: 0, pendentes: 0, comUnmatched: 0 };

  const rows = data ?? [];
  const total = rows.length;
  const splitados = rows.filter((r) => r.split_status !== null).length;
  const pendentes = total - splitados;

  // Contar orcamentos com itens unmatched
  const splitadosIds = rows.filter((r) => r.split_status !== null).map((r) => r.id);
  let comUnmatched = 0;
  if (splitadosIds.length > 0) {
    const { data: unmatchedData } = await supabase
      .from("itens_orcamento")
      .select("orcamento_fechado_id")
      .in("orcamento_fechado_id", splitadosIds)
      .eq("match_status", "unmatched");
    const unmatchedOrcIds = new Set(
      (unmatchedData ?? []).map((r) => r.orcamento_fechado_id)
    );
    comUnmatched = unmatchedOrcIds.size;
  }

  return { totalOrcamentos: total, splitados, pendentes, comUnmatched };
}

/** Buscar orcamentos com itens para revisao */
export async function fetchSplitReview(
  mesReferencia: string,
  clinicaId?: string
): Promise<OrcamentoReviewRow[]> {
  const supabase = await createSupabaseServerClient();
  const start = firstDayOfMonth(mesReferencia);
  const end = lastDayOfMonth(mesReferencia);

  let query = supabase
    .from("orcamentos_fechados")
    .select("id, paciente_nome, procedimentos_texto, valor_total, valor_bruto, desconto_reais, desconto_percentual, split_status")
    .not("split_status", "is", null)
    .gte("mes_referencia", start)
    .lte("mes_referencia", end)
    .order("paciente_nome");

  if (clinicaId) query = query.eq("clinica_id", clinicaId);

  const { data: orcamentos, error: oErr } = await query;
  if (oErr) throw new Error(oErr.message);
  if (!orcamentos?.length) return [];

  const orcIds = orcamentos.map((o) => o.id);

  const { data: itensData, error: iErr } = await supabase
    .from("itens_orcamento")
    .select("id, orcamento_fechado_id, procedimento_id, procedimento_nome_original, quantidade, valor_tabela, valor_proporcional, categoria, match_status")
    .in("orcamento_fechado_id", orcIds)
    .order("created_at");
  if (iErr) throw new Error(iErr.message);

  const itensByOrc = new Map<string, ItemOrcamentoRow[]>();
  for (const it of (itensData ?? []) as ItemOrcamentoRow[]) {
    const list = itensByOrc.get(it.orcamento_fechado_id) ?? [];
    list.push(it);
    itensByOrc.set(it.orcamento_fechado_id, list);
  }

  return orcamentos.map((o) => {
    const itens = itensByOrc.get(o.id) ?? [];
    const somaItens = itens.reduce((acc, it) => acc + Number(it.valor_proporcional), 0);
    const divergencia = Math.round((somaItens - Number(o.valor_total)) * 100) / 100;
    return {
      id: o.id,
      paciente_nome: o.paciente_nome,
      procedimentos_texto: o.procedimentos_texto,
      valor_total: Number(o.valor_total),
      valor_bruto: o.valor_bruto ? Number(o.valor_bruto) : null,
      desconto_reais: o.desconto_reais ? Number(o.desconto_reais) : null,
      desconto_percentual: o.desconto_percentual ? Number(o.desconto_percentual) : null,
      split_status: o.split_status,
      itens,
      soma_itens: Math.round(somaItens * 100) / 100,
      divergencia,
    };
  });
}

/** Atualizar um item de orcamento manualmente */
export async function updateItemOrcamento(
  itemId: string,
  updates: {
    procedimento_id?: string | null;
    procedimento_nome_original?: string;
    valor_proporcional?: number;
    valor_tabela?: number;
    categoria?: string | null;
  }
) {
  const { supabase } = await requireAdmin();

  const updateData: Record<string, unknown> = { match_status: "manual" };
  if (updates.procedimento_id !== undefined) updateData.procedimento_id = updates.procedimento_id;
  if (updates.procedimento_nome_original !== undefined) updateData.procedimento_nome_original = updates.procedimento_nome_original;
  if (updates.valor_proporcional !== undefined) updateData.valor_proporcional = updates.valor_proporcional;
  if (updates.valor_tabela !== undefined) updateData.valor_tabela = updates.valor_tabela;
  if (updates.categoria !== undefined) updateData.categoria = updates.categoria;

  const { error } = await supabase
    .from("itens_orcamento")
    .update(updateData)
    .eq("id", itemId);
  if (error) throw new Error(error.message);

  // Marcar orcamento como revisado
  const { data: item } = await supabase
    .from("itens_orcamento")
    .select("orcamento_fechado_id")
    .eq("id", itemId)
    .single();

  if (item) {
    await supabase
      .from("orcamentos_fechados")
      .update({ split_status: "revisado" })
      .eq("id", item.orcamento_fechado_id);
  }

  revalidatePath("/admin/configuracoes/fechamento");
  revalidatePath("/admin/fechamento");
}

/** Adicionar item a um orcamento */
export async function addItemOrcamento(
  orcamentoId: string,
  item: {
    procedimento_nome_original: string;
    procedimento_id?: string | null;
    valor_tabela?: number;
    valor_proporcional: number;
    categoria?: string | null;
  }
) {
  const { supabase } = await requireAdmin();

  // Buscar clinica_id do orcamento
  const { data: orc } = await supabase
    .from("orcamentos_fechados")
    .select("clinica_id")
    .eq("id", orcamentoId)
    .single();
  if (!orc) throw new Error("Orcamento nao encontrado.");

  const { error } = await supabase.from("itens_orcamento").insert({
    orcamento_fechado_id: orcamentoId,
    clinica_id: orc.clinica_id,
    procedimento_id: item.procedimento_id ?? null,
    procedimento_nome_original: item.procedimento_nome_original,
    quantidade: 1,
    valor_tabela: item.valor_tabela ?? 0,
    valor_proporcional: item.valor_proporcional,
    categoria: item.categoria ?? null,
    match_status: "manual",
  });
  if (error) throw new Error(error.message);

  await supabase
    .from("orcamentos_fechados")
    .update({ split_status: "revisado" })
    .eq("id", orcamentoId);

  revalidatePath("/admin/configuracoes/fechamento");
  revalidatePath("/admin/fechamento");
}

/** Remover item de um orcamento */
export async function removeItemOrcamento(itemId: string) {
  const { supabase } = await requireAdmin();

  const { data: item } = await supabase
    .from("itens_orcamento")
    .select("orcamento_fechado_id")
    .eq("id", itemId)
    .single();

  const { error } = await supabase
    .from("itens_orcamento")
    .delete()
    .eq("id", itemId);
  if (error) throw new Error(error.message);

  if (item) {
    await supabase
      .from("orcamentos_fechados")
      .update({ split_status: "revisado" })
      .eq("id", item.orcamento_fechado_id);
  }

  revalidatePath("/admin/configuracoes/fechamento");
  revalidatePath("/admin/fechamento");
}

/** Deletar itens e re-processar split de um orcamento */
export async function resplitOrcamento(orcamentoId: string) {
  const { supabase } = await requireAdmin();

  // Deletar itens existentes
  await supabase
    .from("itens_orcamento")
    .delete()
    .eq("orcamento_fechado_id", orcamentoId);

  // Reset status
  await supabase
    .from("orcamentos_fechados")
    .update({ split_status: null })
    .eq("id", orcamentoId);

  // Buscar orcamento
  const { data: orc, error: oErr } = await supabase
    .from("orcamentos_fechados")
    .select("id, clinica_id, procedimentos_texto, valor_total, valor_bruto, desconto_reais")
    .eq("id", orcamentoId)
    .single();
  if (oErr || !orc) throw new Error("Orcamento nao encontrado.");

  const procedimentos = await fetchProcedimentosRef(supabase);
  const result = splitOrcamento(orc as OrcamentoParaSplit, procedimentos);

  const inserts = result.items.map((item) => ({
    orcamento_fechado_id: orcamentoId,
    clinica_id: orc.clinica_id,
    procedimento_id: item.procedimento_id,
    procedimento_nome_original: item.procedimento_nome_original,
    quantidade: 1,
    valor_tabela: item.valor_tabela,
    valor_proporcional: item.valor_proporcional,
    categoria: item.categoria,
    match_status: item.match_status,
  }));

  if (inserts.length > 0) {
    const { error: iErr } = await supabase
      .from("itens_orcamento")
      .insert(inserts);
    if (iErr) throw new Error(iErr.message);
  }

  await supabase
    .from("orcamentos_fechados")
    .update({ split_status: "auto" })
    .eq("id", orcamentoId);

  revalidatePath("/admin/configuracoes/fechamento");
  revalidatePath("/admin/fechamento");
}

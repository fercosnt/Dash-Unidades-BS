"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { matchProcedimentoPorNome } from "@/lib/utils/match-procedimento";

export type TratamentoPendenteRow = {
  id: string;
  clinica_id: string;
  clinica_nome: string;
  mes_referencia: string;
  paciente_nome: string;
  procedimento_nome: string | null;
  quantidade: number;
  data_execucao: string | null;
};

export type RevisaoFilters = { clinica_id?: string; mes?: string };

/** Lista tratamentos_executados com procedimento_id IS NULL */
export async function listTratamentosSemProcedimento(
  filters: RevisaoFilters = {}
): Promise<TratamentoPendenteRow[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("tratamentos_executados")
    .select(`
      id,
      clinica_id,
      mes_referencia,
      paciente_nome,
      procedimento_nome,
      quantidade,
      data_execucao,
      clinicas_parceiras(nome)
    `)
    .is("procedimento_id", null)
    .order("mes_referencia", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.clinica_id) query = query.eq("clinica_id", filters.clinica_id);
  if (filters.mes) {
    const start = `${filters.mes}-01`;
    const [y, m] = filters.mes.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${filters.mes}-${String(lastDay).padStart(2, "0")}`;
    query = query.gte("mes_referencia", start).lte("mes_referencia", end);
  }

  const { data, error } = await query;
  if (error) return [];

  type Row = {
    id: string;
    clinica_id: string;
    mes_referencia: string;
    paciente_nome: string;
    procedimento_nome: string | null;
    quantidade: number;
    data_execucao: string | null;
    clinicas_parceiras: { nome: string }[] | { nome: string } | null;
  };
  const rows = (data ?? []) as Row[];
  return rows.map((r) => {
    const clinica = r.clinicas_parceiras;
    const clinicaNome =
      clinica == null
        ? "—"
        : Array.isArray(clinica)
          ? clinica[0]?.nome ?? "—"
          : clinica.nome ?? "—";
    return {
      id: r.id,
      clinica_id: r.clinica_id,
      clinica_nome: clinicaNome,
      mes_referencia: r.mes_referencia.slice(0, 7),
      paciente_nome: r.paciente_nome ?? "",
      procedimento_nome: r.procedimento_nome ?? null,
      quantidade: r.quantidade ?? 1,
      data_execucao: r.data_execucao ?? null,
    };
  });
}

export type ProcedimentoOption = { id: string; nome: string; custo_fixo?: number };

/** Lista procedimentos ativos para o dropdown */
export async function getProcedimentosAtivos(): Promise<ProcedimentoOption[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("procedimentos")
    .select("id, nome, custo_fixo")
    .eq("ativo", true)
    .order("nome");
  if (error) return [];
  return (data ?? []).map((r) => ({ id: r.id, nome: r.nome }));
}

/** Vincula um tratamento a um procedimento */
export async function vincularProcedimento(tratamentoId: string, procedimentoId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { data: proc } = await supabase.from("procedimentos").select("nome").eq("id", procedimentoId).single();
  const { error } = await supabase
    .from("tratamentos_executados")
    .update({
      procedimento_id: procedimentoId,
      procedimento_nome: proc?.nome ?? null,
    })
    .eq("id", tratamentoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/upload/revisao");
  return { ok: true };
}

/** Cria um procedimento rápido e retorna o id */
export async function criarProcedimentoRapido(nome: string): Promise<{ id: string } | { error: string }> {
  const supabase = createSupabaseServerClient();
  const trimmed = nome.trim();
  if (!trimmed) return { error: "Nome é obrigatório" };
  const { data, error } = await supabase
    .from("procedimentos")
    .insert({ nome: trimmed, ativo: true, custo_fixo: 0 })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/admin/upload/revisao");
  revalidatePath("/admin/configuracoes/procedimentos");
  return { id: data!.id };
}

/** Contagem de tratamentos pendentes (para badge no menu) */
export async function countPendentesRevisao(): Promise<number> {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("tratamentos_executados")
    .select("id", { count: "exact", head: true })
    .is("procedimento_id", null);
  if (error) return 0;
  return count ?? 0;
}

/** Vincula múltiplos tratamentos ao mesmo procedimento (bulk) */
export async function vincularProcedimentoBulk(
  tratamentoIds: string[],
  procedimentoId: string
): Promise<{ ok: boolean; vinculados: number; error?: string }> {
  if (tratamentoIds.length === 0) return { ok: true, vinculados: 0 };
  const supabase = createSupabaseServerClient();
  const { data: proc } = await supabase.from("procedimentos").select("nome").eq("id", procedimentoId).single();
  let vinculados = 0;
  for (const id of tratamentoIds) {
    const { error } = await supabase
      .from("tratamentos_executados")
      .update({ procedimento_id: procedimentoId, procedimento_nome: proc?.nome ?? null })
      .eq("id", id);
    if (!error) vinculados++;
  }
  revalidatePath("/admin/upload/revisao");
  return { ok: true, vinculados };
}

export type VincularAutomaticamenteResult = {
  vinculados: number;
  restantes: number;
  error?: string;
};

/**
 * Tenta vincular todos os tratamentos pendentes (com filtros) aos procedimentos
 * pelo nome. Retorna quantos foram vinculados e quantos restam para manual.
 */
export async function vincularAutomaticamente(
  filters: RevisaoFilters = {}
): Promise<VincularAutomaticamenteResult> {
  const supabase = createSupabaseServerClient();

  const [tratamentosRes, procedimentosRes] = await Promise.all([
    (async () => {
      let query = supabase
        .from("tratamentos_executados")
        .select("id, procedimento_nome")
        .is("procedimento_id", null);
      if (filters.clinica_id) query = query.eq("clinica_id", filters.clinica_id);
      if (filters.mes) {
        const start = `${filters.mes}-01`;
        const [y, m] = filters.mes.split("-").map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        const end = `${filters.mes}-${String(lastDay).padStart(2, "0")}`;
        query = query.gte("mes_referencia", start).lte("mes_referencia", end);
      }
      const { data, error } = await query;
      return { data: data ?? [], error };
    })(),
    supabase.from("procedimentos").select("id, nome").eq("ativo", true),
  ]);

  if (tratamentosRes.error) {
    return { vinculados: 0, restantes: 0, error: tratamentosRes.error.message };
  }
  if (procedimentosRes.error) {
    return { vinculados: 0, restantes: 0, error: procedimentosRes.error.message };
  }

  const procedimentos = (procedimentosRes.data ?? []) as { id: string; nome: string }[];
  const pendentes = (tratamentosRes.data ?? []) as { id: string; procedimento_nome: string | null }[];

  const toUpdate: { id: string; procedimento_id: string; procedimento_nome: string }[] = [];
  for (const t of pendentes) {
    const nome = (t.procedimento_nome ?? "").trim() || "(vazio)";
    const matched = matchProcedimentoPorNome(nome, procedimentos);
    if (matched) {
      toUpdate.push({ id: t.id, procedimento_id: matched.id, procedimento_nome: matched.nome });
    }
  }

  for (const u of toUpdate) {
    await supabase
      .from("tratamentos_executados")
      .update({ procedimento_id: u.procedimento_id, procedimento_nome: u.procedimento_nome })
      .eq("id", u.id);
  }

  revalidatePath("/admin/upload/revisao");
  return {
    vinculados: toUpdate.length,
    restantes: pendentes.length - toUpdate.length,
  };
}

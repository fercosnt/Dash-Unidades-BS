"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProcedimentoRow = {
  id: string;
  nome: string;
  codigo_clinicorp: string | null;
  custo_fixo: number;
  valor_tabela: number;
  categoria: string | null;
  ativo: boolean;
  created_at: string;
};

export async function listarProcedimentos(filtros: {
  categoria?: string;
  status?: "todos" | "ativo" | "inativo";
} = {}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("procedimentos")
    .select("id, nome, codigo_clinicorp, custo_fixo, valor_tabela, categoria, ativo, created_at")
    .order("nome");

  if (filtros.categoria?.trim()) query = query.eq("categoria", filtros.categoria.trim());
  if (filtros.status === "ativo") query = query.eq("ativo", true);
  if (filtros.status === "inativo") query = query.eq("ativo", false);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ProcedimentoRow[];
}

export async function listarCategoriasProcedimentos() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("procedimentos")
    .select("categoria")
    .not("categoria", "is", null);
  if (error) throw new Error(error.message);
  const categorias = Array.from(new Set((data ?? []).map((r) => r.categoria).filter(Boolean))) as string[];
  return categorias.sort();
}

export async function criarProcedimento(form: {
  nome: string;
  codigo_clinicorp?: string;
  custo_fixo: number;
  valor_tabela?: number;
  categoria?: string;
  ativo?: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("procedimentos").insert({
    nome: form.nome.trim(),
    codigo_clinicorp: form.codigo_clinicorp?.trim() || null,
    custo_fixo: Number(form.custo_fixo) || 0,
    valor_tabela: Number(form.valor_tabela) || 0,
    categoria: form.categoria?.trim() || null,
    ativo: form.ativo ?? true,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/configuracoes/procedimentos");
}

export async function atualizarProcedimento(
  id: string,
  form: {
    nome: string;
    codigo_clinicorp?: string;
    custo_fixo: number;
    valor_tabela?: number;
    categoria?: string;
    ativo?: boolean;
  }
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("procedimentos")
    .update({
      nome: form.nome.trim(),
      codigo_clinicorp: form.codigo_clinicorp?.trim() || null,
      custo_fixo: Number(form.custo_fixo) || 0,
      valor_tabela: Number(form.valor_tabela) || 0,
      categoria: form.categoria?.trim() || null,
      ativo: form.ativo ?? true,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/configuracoes/procedimentos");
}

export async function toggleAtivoProcedimento(id: string, ativo: boolean) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("procedimentos").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/configuracoes/procedimentos");
}

export async function excluirProcedimento(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("procedimentos").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Não é possível excluir: existem tratamentos vinculados a este procedimento.");
    }
    throw new Error(error.message);
  }
  revalidatePath("/admin/configuracoes/procedimentos");
}

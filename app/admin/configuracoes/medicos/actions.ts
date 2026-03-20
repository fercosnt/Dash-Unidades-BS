"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";

export type MedicoRow = {
  id: string;
  nome: string;
  clinica_id: string;
  clinica_nome: string;
  percentual_comissao: number;
  ativo: boolean;
  created_at: string;
};

export type ClinicaOption = { id: string; nome: string };

export async function listarClinicasAtivas(): Promise<ClinicaOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinicas_parceiras")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []) as ClinicaOption[];
}

export async function listarMedicos(filtroClinicaId?: string) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("medicos_indicadores")
    .select("id, nome, clinica_id, percentual_comissao, ativo, created_at, clinicas_parceiras(nome)")
    .order("nome");

  if (filtroClinicaId?.trim()) query = query.eq("clinica_id", filtroClinicaId.trim());

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    nome: string;
    clinica_id: string;
    percentual_comissao: number;
    ativo: boolean;
    created_at: string;
    clinicas_parceiras: { nome: string }[] | { nome: string } | null;
  };
  const rows: MedicoRow[] = ((data ?? []) as Row[]).map((r) => {
    const clinica = r.clinicas_parceiras;
    const clinicaNome =
      clinica == null
        ? "—"
        : Array.isArray(clinica)
          ? clinica[0]?.nome ?? "—"
          : (clinica as { nome: string }).nome;
    return {
      id: r.id,
      nome: r.nome,
      clinica_id: r.clinica_id,
      percentual_comissao: r.percentual_comissao,
      ativo: r.ativo,
      created_at: r.created_at,
      clinica_nome: clinicaNome,
    };
  });
  return rows;
}

export async function criarMedico(form: {
  nome: string;
  clinica_id: string;
  percentual_comissao: number;
  ativo?: boolean;
}) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("medicos_indicadores").insert({
    nome: form.nome.trim(),
    clinica_id: form.clinica_id,
    percentual_comissao: Number(form.percentual_comissao) || 10,
    ativo: form.ativo ?? true,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/configuracoes/medicos");
}

export async function atualizarMedico(
  id: string,
  form: {
    nome: string;
    clinica_id: string;
    percentual_comissao: number;
    ativo?: boolean;
  }
) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("medicos_indicadores")
    .update({
      nome: form.nome.trim(),
      clinica_id: form.clinica_id,
      percentual_comissao: Number(form.percentual_comissao) || 10,
      ativo: form.ativo ?? true,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/configuracoes/medicos");
}

export async function toggleAtivoMedico(id: string, ativo: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("medicos_indicadores").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/configuracoes/medicos");
}

export async function excluirMedico(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("medicos_indicadores").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Não é possível excluir: existem orçamentos vinculados a este médico.");
    }
    throw new Error(error.message);
  }
  revalidatePath("/admin/configuracoes/medicos");
}

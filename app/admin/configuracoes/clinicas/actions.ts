"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type ClinicaRow = {
  id: string;
  nome: string;
  cnpj: string | null;
  responsavel: string | null;
  email: string | null;
  telefone: string | null;
  custo_mao_de_obra: number;
  percentual_split: number;
  ativo: boolean;
  created_at: string;
};

export async function listarClinicas(filtroStatus: "todas" | "ativa" | "inativa" = "todas") {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("clinicas_parceiras")
    .select("id, nome, cnpj, responsavel, email, telefone, custo_mao_de_obra, percentual_split, ativo, created_at")
    .order("nome");

  if (filtroStatus === "ativa") query = query.eq("ativo", true);
  if (filtroStatus === "inativa") query = query.eq("ativo", false);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ClinicaRow[];
}

export async function criarClinica(form: {
  nome: string;
  cnpj?: string;
  responsavel?: string;
  email?: string;
  telefone?: string;
  custo_mao_de_obra: number;
  percentual_split: number;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("clinicas_parceiras").insert({
    nome: form.nome.trim(),
    cnpj: form.cnpj?.trim() || null,
    responsavel: form.responsavel?.trim() || null,
    email: form.email?.trim() || null,
    telefone: form.telefone?.trim() || null,
    custo_mao_de_obra: Number(form.custo_mao_de_obra) || 0,
    percentual_split: Number(form.percentual_split) ?? 40,
    ativo: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/configuracoes/clinicas");
}

export async function atualizarClinica(
  id: string,
  form: {
    nome: string;
    cnpj?: string;
    responsavel?: string;
    email?: string;
    telefone?: string;
    custo_mao_de_obra: number;
    percentual_split: number;
  }
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("clinicas_parceiras")
    .update({
      nome: form.nome.trim(),
      cnpj: form.cnpj?.trim() || null,
      responsavel: form.responsavel?.trim() || null,
      email: form.email?.trim() || null,
      telefone: form.telefone?.trim() || null,
      custo_mao_de_obra: Number(form.custo_mao_de_obra) || 0,
      percentual_split: Number(form.percentual_split) ?? 40,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/configuracoes/clinicas");
}

export async function toggleAtivoClinica(id: string, ativo: boolean) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("clinicas_parceiras")
    .update({ ativo })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/configuracoes/clinicas");
}

/** Exclui a clínica permanentemente. Falha se houver perfis ou médicos vinculados. */
export async function excluirClinica(id: string) {
  const supabase = createSupabaseAdminClient();

  const [profilesRes, medicosRes] = await Promise.all([
    supabase.from("profiles").select("id").eq("clinica_id", id).limit(1),
    supabase.from("medicos_indicadores").select("id").eq("clinica_id", id).limit(1),
  ]);

  if ((profilesRes.data?.length ?? 0) > 0) {
    throw new Error("Não é possível excluir: existem usuários vinculados a esta clínica. Desvincule ou desative a clínica.");
  }
  if ((medicosRes.data?.length ?? 0) > 0) {
    throw new Error("Não é possível excluir: existem médicos indicadores vinculados. Remova os vínculos primeiro.");
  }

  const { error } = await supabase.from("clinicas_parceiras").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Não é possível excluir: existem dados vinculados a esta clínica (uploads, orçamentos, etc.). Desative a clínica em vez de excluir.");
    }
    throw new Error(error.message);
  }
  revalidatePath("/admin/configuracoes/clinicas");
}

"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ClinicaSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  cnpj: z.string().optional(),
  responsavel: z.string().optional(),
  email: z.string().optional(),
  telefone: z.string().optional(),
  custo_mao_de_obra: z.coerce.number().min(0),
  percentual_split: z.coerce.number().min(0).max(100),
  clinicorp_subscriber_id: z.string().optional(),
  clinicorp_username: z.string().optional(),
  clinicorp_token: z.string().optional(),
  clinicorp_business_id: z.string().optional(),
});

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
  clinicorp_subscriber_id: string | null;
  clinicorp_username: string | null;
  clinicorp_token: string | null;
  clinicorp_business_id: string | null;
};

export async function listarClinicas(filtroStatus: "todas" | "ativa" | "inativa" = "todas") {
  const { supabase } = await requireAdmin();
  let query = supabase
    .from("clinicas_parceiras")
    .select("id, nome, cnpj, responsavel, email, telefone, custo_mao_de_obra, percentual_split, ativo, created_at, clinicorp_subscriber_id, clinicorp_username, clinicorp_token, clinicorp_business_id")
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
  clinicorp_subscriber_id?: string;
  clinicorp_username?: string;
  clinicorp_token?: string;
  clinicorp_business_id?: string;
}) {
  const parsed = ClinicaSchema.safeParse(form);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("clinicas_parceiras").insert({
    nome: form.nome.trim(),
    cnpj: form.cnpj?.trim() || null,
    responsavel: form.responsavel?.trim() || null,
    email: form.email?.trim() || null,
    telefone: form.telefone?.trim() || null,
    custo_mao_de_obra: Number(form.custo_mao_de_obra) || 0,
    percentual_split: Number(form.percentual_split) || 40,
    ativo: true,
    clinicorp_subscriber_id: form.clinicorp_subscriber_id?.trim() || null,
    clinicorp_username: form.clinicorp_username?.trim() || null,
    clinicorp_token: form.clinicorp_token?.trim() || null,
    clinicorp_business_id: form.clinicorp_business_id?.trim() || null,
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
    clinicorp_subscriber_id?: string;
    clinicorp_username?: string;
    clinicorp_token?: string;
    clinicorp_business_id?: string;
  }
) {
  const parsed = ClinicaSchema.safeParse(form);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  z.string().uuid("ID inválido").parse(id);
  await requireAdmin();
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
      percentual_split: Number(form.percentual_split) || 40,
      clinicorp_subscriber_id: form.clinicorp_subscriber_id?.trim() || null,
      clinicorp_username: form.clinicorp_username?.trim() || null,
      clinicorp_token: form.clinicorp_token?.trim() || null,
      clinicorp_business_id: form.clinicorp_business_id?.trim() || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/configuracoes/clinicas");
}

export async function toggleAtivoClinica(id: string, ativo: boolean) {
  await requireAdmin();
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
  await requireAdmin();
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

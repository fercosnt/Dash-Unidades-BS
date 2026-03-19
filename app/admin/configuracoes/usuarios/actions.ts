"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type UsuarioRow = {
  id: string;
  email: string | null;
  nome: string | null;
  role: string;
  clinica_id: string | null;
  clinica_nome: string | null;
  ativo: boolean;
  created_at: string;
};

export type ClinicaOption = {
  id: string;
  nome: string;
};

const REVALIDATE_PATH = "/admin/configuracoes/usuarios";

export async function listarUsuarios(
  filtroStatus: "todos" | "ativo" | "inativo" = "todos"
) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("profiles")
    .select("id, email, nome, role, clinica_id, ativo, created_at")
    .order("nome");

  if (filtroStatus === "ativo") query = query.eq("ativo", true);
  if (filtroStatus === "inativo") query = query.eq("ativo", false);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Busca nomes das clínicas separadamente (profiles não tem FK para clinicas_parceiras)
  const clinicaIds = [
    ...new Set(
      (data ?? [])
        .map((r: Record<string, unknown>) => r.clinica_id as string | null)
        .filter(Boolean)
    ),
  ];
  const clinicaMap = new Map<string, string>();
  if (clinicaIds.length > 0) {
    const { data: clinicas } = await supabase
      .from("clinicas_parceiras")
      .select("id, nome")
      .in("id", clinicaIds);
    for (const c of clinicas ?? []) {
      clinicaMap.set(c.id, c.nome);
    }
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    email: row.email as string | null,
    nome: row.nome as string | null,
    role: row.role as string,
    clinica_id: row.clinica_id as string | null,
    clinica_nome: clinicaMap.get(row.clinica_id as string) ?? null,
    ativo: row.ativo as boolean,
    created_at: row.created_at as string,
  })) as UsuarioRow[];
}

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

export async function criarUsuario(form: {
  email: string;
  senha: string;
  nome: string;
  role: "admin" | "parceiro";
  clinica_id?: string;
}) {
  if (!form.email.trim()) throw new Error("E-mail é obrigatório.");
  if (!form.senha || form.senha.length < 6)
    throw new Error("Senha deve ter no mínimo 6 caracteres.");
  if (!form.nome.trim()) throw new Error("Nome é obrigatório.");
  if (form.role === "parceiro" && !form.clinica_id)
    throw new Error("Parceiro precisa estar vinculado a uma clínica.");

  const supabase = createSupabaseAdminClient();

  // 1. Cria usuário no Supabase Auth
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: form.email.trim(),
      password: form.senha,
      email_confirm: true,
    });
  if (authError) {
    if (authError.message.includes("already been registered")) {
      throw new Error("Este e-mail já está cadastrado.");
    }
    throw new Error(authError.message);
  }

  const userId = authData.user.id;

  // 2. Cria perfil na tabela profiles
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    email: form.email.trim(),
    nome: form.nome.trim(),
    role: form.role,
    clinica_id: form.role === "parceiro" ? form.clinica_id! : null,
    ativo: true,
  });

  if (profileError) {
    // Rollback: remove usuário do auth se o perfil falhar
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(profileError.message);
  }

  revalidatePath(REVALIDATE_PATH);
}

export async function atualizarUsuario(
  id: string,
  form: {
    nome: string;
    role: "admin" | "parceiro";
    clinica_id?: string;
  }
) {
  if (!form.nome.trim()) throw new Error("Nome é obrigatório.");
  if (form.role === "parceiro" && !form.clinica_id)
    throw new Error("Parceiro precisa estar vinculado a uma clínica.");

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      nome: form.nome.trim(),
      role: form.role,
      clinica_id: form.role === "parceiro" ? form.clinica_id! : null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function toggleAtivoUsuario(id: string, ativo: boolean) {
  const supabase = createSupabaseAdminClient();

  // Atualiza perfil
  const { error } = await supabase
    .from("profiles")
    .update({ ativo })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Ban/unban no Auth para impedir/permitir login
  if (ativo) {
    await supabase.auth.admin.updateUserById(id, { ban_duration: "none" });
  } else {
    await supabase.auth.admin.updateUserById(id, {
      ban_duration: "876000h",
    }); // ~100 anos
  }

  revalidatePath(REVALIDATE_PATH);
}

export async function resetarSenha(id: string, novaSenha: string) {
  if (!novaSenha || novaSenha.length < 6)
    throw new Error("Senha deve ter no mínimo 6 caracteres.");

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(id, {
    password: novaSenha,
  });
  if (error) throw new Error(error.message);
}

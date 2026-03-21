"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type CategoriaRow = {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
};

const CriarCategoriaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
});

const EditarCategoriaSchema = z.object({
  id: z.string().uuid("ID inválido"),
  nome: z.string().min(1, "Nome é obrigatório"),
});

/** Busca todas as categorias de despesa ordenadas por nome */
export async function fetchTodasCategorias(): Promise<CategoriaRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categorias_despesa")
    .select("id, nome, ativo, created_at")
    .order("nome", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CategoriaRow[];
}

/** Cria uma nova categoria de despesa */
export async function criarCategoria(input: unknown) {
  const parsed = CriarCategoriaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("categorias_despesa")
    .insert({ nome: parsed.data.nome.trim() });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Já existe uma categoria com esse nome." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/configuracoes/categorias-despesa");
  return { ok: true };
}

/** Edita o nome de uma categoria */
export async function editarCategoria(input: unknown) {
  const parsed = EditarCategoriaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("categorias_despesa")
    .update({ nome: parsed.data.nome.trim() })
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Já existe uma categoria com esse nome." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/configuracoes/categorias-despesa");
  return { ok: true };
}

/** Ativa ou desativa uma categoria */
export async function toggleCategoria(id: string, ativo: boolean) {
  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) return { ok: false, error: "ID inválido." };
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("categorias_despesa")
    .update({ ativo })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/configuracoes/categorias-despesa");
  return { ok: true };
}

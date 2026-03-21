"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const PATH = "/admin/despesas";

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

const CriarDespesaSchema = z.object({
  clinicaId: z.string().uuid(),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoriaId: z.string().uuid(),
  descricao: z.string().optional(),
  valor: z.number().positive("Valor deve ser positivo"),
  recorrente: z.boolean().default(false),
});

const EditarDespesaSchema = z.object({
  id: z.string().uuid(),
  categoriaId: z.string().uuid().optional(),
  descricao: z.string().optional(),
  valor: z.number().positive("Valor deve ser positivo").optional(),
  recorrente: z.boolean().optional(),
});

const CriarBulkSchema = z.object({
  clinicaId: z.string().uuid(),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(z.object({
    categoriaId: z.string().uuid(),
    descricao: z.string().optional(),
    valor: z.number().positive(),
    recorrente: z.boolean().default(false),
  })).min(1),
});

/* ------------------------------------------------------------------ */
/*  Fetch clínicas (para select na UI)                                 */
/* ------------------------------------------------------------------ */

export async function fetchClinicas() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinicas_parceiras")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");
  if (error) {
    console.error("[fetchClinicas]", error.message);
    return [];
  }
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/*  CRUD Despesas                                                      */
/* ------------------------------------------------------------------ */

export async function criarDespesa(input: unknown) {
  const parsed = CriarDespesaSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("despesas_operacionais").insert({
    clinica_id: parsed.data.clinicaId,
    mes_referencia: parsed.data.mesReferencia,
    categoria_id: parsed.data.categoriaId,
    descricao: parsed.data.descricao || null,
    valor: parsed.data.valor,
    recorrente: parsed.data.recorrente,
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(PATH);
  return { ok: true as const };
}

export async function editarDespesa(input: unknown) {
  const parsed = EditarDespesaSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { supabase } = await requireAdmin();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.categoriaId) update.categoria_id = parsed.data.categoriaId;
  if (parsed.data.descricao !== undefined) update.descricao = parsed.data.descricao || null;
  if (parsed.data.valor) update.valor = parsed.data.valor;
  if (parsed.data.recorrente !== undefined) update.recorrente = parsed.data.recorrente;

  const { error } = await supabase
    .from("despesas_operacionais")
    .update(update)
    .eq("id", parsed.data.id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(PATH);
  return { ok: true as const };
}

export async function excluirDespesa(id: string) {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false as const, error: "ID inválido." };
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("despesas_operacionais")
    .delete()
    .eq("id", parsed.data);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(PATH);
  return { ok: true as const };
}

/* ------------------------------------------------------------------ */
/*  Criar em lote (upload XLSX)                                        */
/* ------------------------------------------------------------------ */

export async function criarDespesasBulk(input: unknown) {
  const parsed = CriarBulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { supabase } = await requireAdmin();

  const rows = parsed.data.items.map((item) => ({
    clinica_id: parsed.data.clinicaId,
    mes_referencia: parsed.data.mesReferencia,
    categoria_id: item.categoriaId,
    descricao: item.descricao || null,
    valor: item.valor,
    recorrente: item.recorrente,
  }));

  const { error } = await supabase.from("despesas_operacionais").insert(rows);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(PATH);
  return { ok: true as const, count: rows.length };
}

/* ------------------------------------------------------------------ */
/*  Copiar do mês anterior                                             */
/* ------------------------------------------------------------------ */

export async function copiarDespesasMesAnterior(
  clinicaId: string,
  mesDestino: string,
) {
  const { supabase } = await requireAdmin();

  // Calcular mês anterior
  const [y, m] = mesDestino.split("-").map(Number);
  const prev = new Date(y, m - 2, 1); // m-1 for 0-indexed, -1 for previous
  const mesOrigem = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;

  // Buscar recorrentes do mês anterior
  const { data: origens, error: fetchErr } = await supabase
    .from("despesas_operacionais")
    .select("categoria_id, descricao, valor, recorrente")
    .eq("clinica_id", clinicaId)
    .eq("mes_referencia", mesOrigem)
    .eq("recorrente", true);

  if (fetchErr) return { ok: false as const, error: fetchErr.message };
  if (!origens || origens.length === 0) return { ok: false as const, error: "Nenhuma despesa recorrente no mês anterior." };

  // Verificar se já existem despesas no mês destino para evitar duplicatas
  const { count } = await supabase
    .from("despesas_operacionais")
    .select("id", { count: "exact", head: true })
    .eq("clinica_id", clinicaId)
    .eq("mes_referencia", mesDestino)
    .eq("recorrente", true);

  if (count && count > 0) {
    return { ok: false as const, error: `Já existem ${count} despesas recorrentes neste mês.` };
  }

  const rows = origens.map((o) => ({
    clinica_id: clinicaId,
    mes_referencia: mesDestino,
    categoria_id: o.categoria_id,
    descricao: o.descricao,
    valor: o.valor,
    recorrente: true,
  }));

  const { error } = await supabase.from("despesas_operacionais").insert(rows);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(PATH);
  return { ok: true as const, count: rows.length };
}

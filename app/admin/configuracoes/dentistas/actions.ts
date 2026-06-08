"use server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { z } from "zod";
import { ok, fail, type ActionResult } from "@/types/action-result";

const CriarDentistaSchema = z.object({
  clinicaId: z.string().uuid(),
  nome: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  telefone: z.string().optional(),
});

export async function criarDentista(input: unknown): Promise<ActionResult> {
  const parsed = CriarDentistaSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("dentistas").insert({
    clinica_id: parsed.data.clinicaId,
    nome: parsed.data.nome,
    email: parsed.data.email || null,
    telefone: parsed.data.telefone || null,
  });
  if (error) {
    // Unique constraint violation = clinic already has active dentist
    if (error.code === "23505") return fail("Esta clínica já tem uma dentista ativa. Desative primeiro.");
    return fail(error.message);
  }
  return ok();
}

export async function desativarDentista(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("dentistas").update({ ativo: false }).eq("id", id);
  if (error) return fail(error.message);
  return ok();
}

export async function ativarDentista(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("dentistas").update({ ativo: true }).eq("id", id);
  if (error) {
    if (error.code === "23505") return fail("Esta clínica já tem uma dentista ativa. Desative primeiro.");
    return fail(error.message);
  }
  return ok();
}

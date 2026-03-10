"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const CriarDebitoSchema = z.object({
  clinicaId: z.string().uuid(),
  descricao: z.string().min(1),
  valorTotal: z.number().positive(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function criarDebito(input: unknown) {
  const parsed = CriarDebitoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("debito_parceiro").insert({
    clinica_id: parsed.data.clinicaId,
    descricao: parsed.data.descricao,
    valor_total: parsed.data.valorTotal,
    data_inicio: parsed.data.dataInicio,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function quitarDebito(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("debito_parceiro")
    .update({ status: "quitado" })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

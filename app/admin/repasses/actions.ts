"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const DarBaixaSchema = z.object({
  clinicaId: z.string().uuid(),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/),
  valorRepasse: z.number().positive(),
  dataTransferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observacao: z.string().optional(),
});

export async function darBaixaRepasse(input: unknown) {
  const parsed = DarBaixaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const { clinicaId, mesReferencia, valorRepasse, dataTransferencia, observacao } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("repasses_mensais").insert({
    clinica_id: clinicaId,
    mes_referencia: `${mesReferencia}-01`,
    valor_repasse: valorRepasse,
    data_transferencia: dataTransferencia,
    observacao: observacao ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

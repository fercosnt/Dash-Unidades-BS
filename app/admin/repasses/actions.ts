"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const DarBaixaSchema = z.object({
  clinicaId: z.string().uuid(),
  mesReferencia: z.string().regex(/^\d{4}-\d{2}$/),
  valorRepasse: z.number().positive(),
  dataTransferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observacao: z.string().optional(),
  abatimento: z.number().min(0).optional(),
});

export async function darBaixaRepasse(input: unknown) {
  const parsed = DarBaixaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const { clinicaId, mesReferencia, valorRepasse, dataTransferencia, observacao, abatimento } = parsed.data;

  const supabase = await createSupabaseServerClient();

  // Insert repasse
  const { data: repasseData, error: repasseError } = await supabase
    .from("repasses_mensais")
    .insert({
      clinica_id: clinicaId,
      mes_referencia: `${mesReferencia}-01`,
      valor_repasse: valorRepasse,
      data_transferencia: dataTransferencia,
      observacao: observacao ?? null,
    })
    .select("id")
    .single();

  if (repasseError) return { ok: false, error: repasseError.message };

  // Handle abatimento de débito
  if (abatimento && abatimento > 0 && repasseData) {
    const repasseId = (repasseData as Record<string, unknown>).id as string;

    const { data: debito } = await supabase
      .from("debito_parceiro")
      .select("id, valor_total, valor_pago")
      .eq("clinica_id", clinicaId)
      .eq("status", "ativo")
      .maybeSingle();

    if (debito) {
      const d = debito as Record<string, unknown>;
      const debitoId = d.id as string;
      const novoValorPago = Number(d.valor_pago) + abatimento;
      const valorTotal = Number(d.valor_total);

      await supabase.from("abatimentos_debito").insert({
        debito_id: debitoId,
        mes_referencia: `${mesReferencia}-01`,
        valor_abatido: abatimento,
        repasse_id: repasseId,
      });

      await supabase
        .from("debito_parceiro")
        .update({
          valor_pago: novoValorPago,
          status: novoValorPago >= valorTotal ? "quitado" : "ativo",
        })
        .eq("id", debitoId);
    }
  }

  return { ok: true };
}

export async function desfazerRepasse(id: string) {
  const supabase = await createSupabaseServerClient();

  // Find abatimentos linked to this repasse
  const { data: abatimentos } = await supabase
    .from("abatimentos_debito")
    .select("id, debito_id")
    .eq("repasse_id", id);

  // Reverse each abatimento's effect on debito_parceiro
  for (const ab of (abatimentos ?? []) as Array<Record<string, unknown>>) {
    const abId = ab.id as string;
    const debitoId = ab.debito_id as string;

    await supabase.from("abatimentos_debito").delete().eq("id", abId);

    // Recalculate valor_pago from remaining abatimentos
    const { data: remaining } = await supabase
      .from("abatimentos_debito")
      .select("valor_abatido")
      .eq("debito_id", debitoId);

    const novoValorPago = (remaining ?? []).reduce(
      (sum, r) => sum + Number((r as Record<string, unknown>).valor_abatido),
      0
    );

    const { data: debito } = await supabase
      .from("debito_parceiro")
      .select("valor_total")
      .eq("id", debitoId)
      .maybeSingle();

    if (debito) {
      const valorTotal = Number((debito as Record<string, unknown>).valor_total);
      await supabase
        .from("debito_parceiro")
        .update({
          valor_pago: novoValorPago,
          status: novoValorPago >= valorTotal ? "quitado" : "ativo",
        })
        .eq("id", debitoId);
    }
  }

  const { error } = await supabase.from("repasses_mensais").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

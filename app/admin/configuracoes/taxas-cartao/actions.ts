"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const TaxaSchema = z.object({
  modalidade: z.enum(["credito", "debito"]),
  bandeira: z.enum(["visa_master", "outros"]),
  numero_parcelas: z.number().int().min(1).max(12).nullable(),
  taxa_percentual: z.coerce.number().min(0).max(100),
});

const TaxasArraySchema = z.array(TaxaSchema);

export type TaxaCartaoRow = {
  id: string;
  modalidade: string;
  bandeira: string;
  numero_parcelas: number | null;
  taxa_percentual: number;
};

/** Taxas vigentes (vigencia_fim IS NULL) */
export async function fetchTaxasVigentes(): Promise<TaxaCartaoRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("taxas_cartao_reais")
    .select("id, modalidade, bandeira, numero_parcelas, taxa_percentual")
    .is("vigencia_fim", null)
    .order("bandeira", { ascending: true })
    .order("modalidade", { ascending: true })
    .order("numero_parcelas", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TaxaCartaoRow[];
}

/** Salva todas as taxas: fecha vigentes (vigencia_fim = ontem), insere novas (vigencia_inicio = hoje) */
export async function salvarTaxas(
  taxas: Array<{ modalidade: string; bandeira: string; numero_parcelas: number | null; taxa_percentual: number }>
) {
  const parsed = TaxasArraySchema.safeParse(taxas);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const { supabase } = await requireAdmin();

  const hoje = new Date().toISOString().slice(0, 10);
  const ontem = new Date(Date.now() - 864e5).toISOString().slice(0, 10);

  // Fechar todas as taxas vigentes
  const { data: vigentes } = await supabase
    .from("taxas_cartao_reais")
    .select("id")
    .is("vigencia_fim", null);

  if (vigentes && vigentes.length > 0) {
    const ids = vigentes.map((v) => v.id);
    const { error: updateError } = await supabase
      .from("taxas_cartao_reais")
      .update({ vigencia_fim: ontem })
      .in("id", ids);
    if (updateError) throw new Error(updateError.message);
  }

  // Inserir novas taxas
  const rows = parsed.data.map((t) => ({
    modalidade: t.modalidade,
    bandeira: t.bandeira,
    numero_parcelas: t.numero_parcelas,
    taxa_percentual: Number(t.taxa_percentual),
    vigencia_inicio: hoje,
    vigencia_fim: null,
  }));

  const { error: insertError } = await supabase
    .from("taxas_cartao_reais")
    .insert(rows);
  if (insertError) throw new Error(insertError.message);

  revalidatePath("/admin/configuracoes/taxas-cartao");
}

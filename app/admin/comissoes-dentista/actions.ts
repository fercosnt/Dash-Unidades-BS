"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calcularComissaoDentista } from "@/lib/comissao-dentista-queries";

export { calcularComissaoDentista };

export async function darBaixaComissaoDentista(
  id: string,
  dataPagamento: string,
  observacao?: string
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("comissoes_dentista")
    .update({ status: "pago", data_pagamento: dataPagamento, observacao: observacao ?? null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

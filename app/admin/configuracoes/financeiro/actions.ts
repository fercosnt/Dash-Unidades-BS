"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ConfigFinanceiraRow = {
  id: string;
  taxa_cartao_percentual: number;
  imposto_nf_percentual: number;
  percentual_beauty_smile: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  created_at: string;
};

/** Configuração vigente (vigencia_fim IS NULL) */
export async function getConfigVigente(): Promise<ConfigFinanceiraRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("configuracoes_financeiras")
    .select("id, taxa_cartao_percentual, imposto_nf_percentual, percentual_beauty_smile, vigencia_inicio, vigencia_fim, created_at")
    .is("vigencia_fim", null)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data as ConfigFinanceiraRow | null;
}

/** Histórico: todas as configurações ordenadas por vigencia_inicio DESC */
export async function getHistoricoConfig(): Promise<ConfigFinanceiraRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("configuracoes_financeiras")
    .select("id, taxa_cartao_percentual, imposto_nf_percentual, percentual_beauty_smile, vigencia_inicio, vigencia_fim, created_at")
    .order("vigencia_inicio", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ConfigFinanceiraRow[];
}

/** Salva nova configuração: cria registro com vigencia_inicio = hoje e fecha o anterior com vigencia_fim = ontem */
export async function salvarConfigFinanceira(form: {
  taxa_cartao_percentual: number;
  imposto_nf_percentual: number;
  percentual_beauty_smile: number;
}) {
  const supabase = await createSupabaseServerClient();

  const hoje = new Date().toISOString().slice(0, 10);
  const ontem = new Date(Date.now() - 864e5).toISOString().slice(0, 10);

  const { data: vigente } = await supabase
    .from("configuracoes_financeiras")
    .select("id")
    .is("vigencia_fim", null)
    .single();

  if (vigente?.id) {
    const { error: updateError } = await supabase
      .from("configuracoes_financeiras")
      .update({ vigencia_fim: ontem })
      .eq("id", vigente.id);
    if (updateError) throw new Error(updateError.message);
  }

  const { error: insertError } = await supabase.from("configuracoes_financeiras").insert({
    taxa_cartao_percentual: Number(form.taxa_cartao_percentual),
    imposto_nf_percentual: Number(form.imposto_nf_percentual),
    percentual_beauty_smile: Number(form.percentual_beauty_smile),
    vigencia_inicio: hoje,
    vigencia_fim: null,
  });
  if (insertError) throw new Error(insertError.message);

  revalidatePath("/admin/configuracoes/financeiro");
}

"use server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function calcularComissoesMes(mes: string) {
  const { supabase } = await requireAdmin();

  const { data: medicos } = await supabase
    .from("medicos_indicadores")
    .select("id, clinica_id, percentual_comissao")
    .eq("ativo", true);

  if (!medicos?.length) return { ok: true, count: 0 };

  const start = `${mes}-01`;
  const [y, m] = mes.split("-").map(Number);
  const end = `${mes}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  let count = 0;
  type MedicoRow = { id: string; clinica_id: string; percentual_comissao: number };

  for (const medico of medicos as MedicoRow[]) {
    const { data: orcamentos } = await supabase
      .from("orcamentos_fechados")
      .select("valor_total")
      .eq("medico_indicador_id", medico.id)
      .gte("mes_referencia", start)
      .lte("mes_referencia", end);

    const total = ((orcamentos ?? []) as Array<{ valor_total: number }>).reduce(
      (acc, o) => acc + Number(o.valor_total),
      0
    );

    if (total <= 0) continue;

    const valorComissao = total * (medico.percentual_comissao / 100);

    await supabase.from("pagamentos_comissao").upsert(
      {
        medico_indicador_id: medico.id,
        clinica_id: medico.clinica_id,
        mes_referencia: mes,
        valor_comissao: valorComissao,
        status: "pendente",
      },
      { onConflict: "medico_indicador_id,mes_referencia" }
    );

    count++;
  }

  return { ok: true, count };
}

export async function darBaixaComissao(id: string, observacao?: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("pagamentos_comissao")
    .update({
      status: "pago",
      data_pagamento: new Date().toISOString().slice(0, 10),
      ...(observacao ? { observacao } : {}),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

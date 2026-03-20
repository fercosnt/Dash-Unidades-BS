"use server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { z } from "zod";

export async function calcularComissoesMes(mes: string) {
  const { supabase } = await requireAdmin();

  const MesSchema = z.string().regex(/^\d{4}-\d{2}$/, "Formato: YYYY-MM");
  const parsed = MesSchema.safeParse(mes);
  if (!parsed.success) return { ok: false, count: 0, error: parsed.error.issues[0].message };

  const { data: medicos } = await supabase
    .from("medicos_indicadores")
    .select("id, clinica_id, percentual_comissao")
    .eq("ativo", true);

  if (!medicos?.length) return { ok: true, count: 0 };

  const start = `${mes}-01`;
  const [y, m] = mes.split("-").map(Number);
  const end = `${mes}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  type MedicoRow = { id: string; clinica_id: string; percentual_comissao: number };
  const medicoList = medicos as MedicoRow[];
  const medicoIds = medicoList.map((m) => m.id);

  // Fetch ALL orcamentos for the month in ONE query
  const { data: allOrcamentos } = await supabase
    .from("orcamentos_fechados")
    .select("valor_total, medico_indicador_id")
    .in("medico_indicador_id", medicoIds)
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);

  // Group by medico in memory
  const totalByMedico = new Map<string, number>();
  for (const orc of (allOrcamentos ?? []) as Array<{ valor_total: number; medico_indicador_id: string }>) {
    const current = totalByMedico.get(orc.medico_indicador_id) ?? 0;
    totalByMedico.set(orc.medico_indicador_id, current + Number(orc.valor_total));
  }

  // Build upsert records
  const upsertRecords: Array<{
    medico_indicador_id: string;
    clinica_id: string;
    mes_referencia: string;
    valor_comissao: number;
    status: string;
  }> = [];

  for (const medico of medicoList) {
    const total = totalByMedico.get(medico.id) ?? 0;
    if (total <= 0) continue;
    const valorComissao = total * (medico.percentual_comissao / 100);
    upsertRecords.push({
      medico_indicador_id: medico.id,
      clinica_id: medico.clinica_id,
      mes_referencia: mes,
      valor_comissao: valorComissao,
      status: "pendente",
    });
  }

  // Single bulk upsert
  if (upsertRecords.length > 0) {
    await supabase.from("pagamentos_comissao").upsert(upsertRecords, {
      onConflict: "medico_indicador_id,mes_referencia",
    });
  }

  return { ok: true, count: upsertRecords.length };
}

export async function darBaixaComissao(id: string, observacao?: string) {
  const idParsed = z.string().uuid("ID inválido").safeParse(id);
  if (!idParsed.success) return { ok: false, error: idParsed.error.issues[0].message };
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

"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/utils/date-helpers";

export type OrcamentoFechadoRow = {
  id: string;
  pacienteNome: string;
  valorTotal: number;
  valorPago: number;
  valorEmAberto: number;
  status: string;
  dataFechamento: string | null;
  temIndicacao: boolean;
};

export type OrcamentoAbertoRow = {
  id: string;
  pacienteNome: string;
  valorTotal: number;
  status: string;
  dataCriacao: string | null;
};

export type OrcamentosKpis = {
  totalFechados: number;
  valorTotalFechados: number;
  totalAbertos: number;
  valorTotalAbertos: number;
  valorEmAberto: number;
  valorPago: number;
};

export async function getOrcamentosFechados(
  mesRef: string,
  statusFilter?: string
): Promise<OrcamentoFechadoRow[]> {
  const supabase = await createSupabaseServerClient();
  const start = firstDayOfMonth(mesRef);
  const end = lastDayOfMonth(mesRef);
  let q = supabase
    .from("orcamentos_fechados")
    .select("id, paciente_nome, valor_total, valor_pago, valor_em_aberto, status, data_fechamento, medico_indicador_id")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end)
    .order("valor_em_aberto", { ascending: false });
  if (statusFilter && statusFilter !== "todos") {
    q = q.eq("status", statusFilter);
  }
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    pacienteNome: (row.paciente_nome as string) ?? "",
    valorTotal: Number(row.valor_total ?? 0),
    valorPago: Number(row.valor_pago ?? 0),
    valorEmAberto: Number(row.valor_em_aberto ?? 0),
    status: (row.status as string) ?? "em_aberto",
    dataFechamento: row.data_fechamento as string | null,
    temIndicacao: !!row.medico_indicador_id,
  }));
}

export async function getOrcamentosAbertos(
  mesRef: string
): Promise<OrcamentoAbertoRow[]> {
  const supabase = await createSupabaseServerClient();
  const start = firstDayOfMonth(mesRef);
  const end = lastDayOfMonth(mesRef);
  const { data, error } = await supabase
    .from("orcamentos_abertos")
    .select("id, paciente_nome, valor_total, status, data_criacao")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end)
    .order("valor_total", { ascending: false });
  if (error) return [];
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    pacienteNome: (row.paciente_nome as string) ?? "",
    valorTotal: Number(row.valor_total ?? 0),
    status: (row.status as string) ?? "aberto",
    dataCriacao: row.data_criacao as string | null,
  }));
}

export async function getOrcamentosKpis(mesRef: string): Promise<OrcamentosKpis> {
  const [fechados, abertos] = await Promise.all([
    getOrcamentosFechados(mesRef),
    getOrcamentosAbertos(mesRef),
  ]);
  return {
    totalFechados: fechados.length,
    valorTotalFechados: fechados.reduce((s, r) => s + r.valorTotal, 0),
    totalAbertos: abertos.length,
    valorTotalAbertos: abertos.reduce((s, r) => s + r.valorTotal, 0),
    valorEmAberto: fechados.reduce((s, r) => s + r.valorEmAberto, 0),
    valorPago: fechados.reduce((s, r) => s + r.valorPago, 0),
  };
}

export async function getMesesDisponiveis(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orcamentos_fechados")
    .select("mes_referencia")
    .order("mes_referencia", { ascending: false });
  if (error || !data) return [];
  const meses = Array.from(
    new Set(
      (data as { mes_referencia: string }[]).map((r) => {
        const d = r.mes_referencia;
        return d ? d.substring(0, 7) : "";
      }).filter(Boolean)
    )
  );
  return meses;
}

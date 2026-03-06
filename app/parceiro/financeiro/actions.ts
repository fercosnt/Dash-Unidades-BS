"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function firstDay(mesRef: string) {
  return `${mesRef}-01`;
}
function lastDay(mesRef: string) {
  const [y, m] = mesRef.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${mesRef}-${String(last).padStart(2, "0")}`;
}

export type ResumoMensal = {
  mesReferencia: string;
  faturamentoBruto: number;
  totalCustosProcedimentos: number;
  totalCustoMaoDeObra: number;
  totalTaxaCartao: number;
  totalImpostoNf: number;
  totalComissoesMedicas: number;
  valorLiquido: number;
  valorBeautySmile: number;
  valorClinica: number;
  totalRecebidoMes: number;
  totalAReceberMes: number;
  totalInadimplente: number;
};

export async function getResumoMes(mesRef: string): Promise<ResumoMensal | null> {
  const supabase = await createSupabaseServerClient();
  const start = firstDay(mesRef);
  const end = lastDay(mesRef);
  const { data, error } = await supabase
    .from("resumo_mensal")
    .select("*")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  return {
    mesReferencia: mesRef,
    faturamentoBruto: Number(r.faturamento_bruto ?? 0),
    totalCustosProcedimentos: Number(r.total_custos_procedimentos ?? 0),
    totalCustoMaoDeObra: Number(r.total_custo_mao_obra ?? 0),
    totalTaxaCartao: Number(r.total_taxa_cartao ?? 0),
    totalImpostoNf: Number(r.total_imposto_nf ?? 0),
    totalComissoesMedicas: Number(r.total_comissoes_medicas ?? 0),
    valorLiquido: Number(r.valor_liquido ?? 0),
    valorBeautySmile: Number(r.valor_beauty_smile ?? 0),
    valorClinica: Number(r.valor_clinica ?? 0),
    totalRecebidoMes: Number(r.total_recebido_mes ?? 0),
    totalAReceberMes: Number(r.total_a_receber_mes ?? 0),
    totalInadimplente: Number(r.total_inadimplente ?? 0),
  };
}

export async function getHistoricoResumos(mesesAtras: number = 12): Promise<ResumoMensal[]> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - mesesAtras + 1, 1);
  const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-01`;
  const endMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const endStr = lastDay(endMes);

  const { data, error } = await supabase
    .from("resumo_mensal")
    .select("*")
    .gte("mes_referencia", startStr)
    .lte("mes_referencia", endStr)
    .order("mes_referencia", { ascending: false });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    mesReferencia: ((r.mes_referencia as string) ?? "").substring(0, 7),
    faturamentoBruto: Number(r.faturamento_bruto ?? 0),
    totalCustosProcedimentos: Number(r.total_custos_procedimentos ?? 0),
    totalCustoMaoDeObra: Number(r.total_custo_mao_obra ?? 0),
    totalTaxaCartao: Number(r.total_taxa_cartao ?? 0),
    totalImpostoNf: Number(r.total_imposto_nf ?? 0),
    totalComissoesMedicas: Number(r.total_comissoes_medicas ?? 0),
    valorLiquido: Number(r.valor_liquido ?? 0),
    valorBeautySmile: Number(r.valor_beauty_smile ?? 0),
    valorClinica: Number(r.valor_clinica ?? 0),
    totalRecebidoMes: Number(r.total_recebido_mes ?? 0),
    totalAReceberMes: Number(r.total_a_receber_mes ?? 0),
    totalInadimplente: Number(r.total_inadimplente ?? 0),
  }));
}

export async function getMesesComResumo(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("resumo_mensal")
    .select("mes_referencia")
    .order("mes_referencia", { ascending: false });
  if (error || !data) return [];
  return Array.from(
    new Set(
      (data as { mes_referencia: string }[])
        .map((r) => r.mes_referencia?.substring(0, 7) ?? "")
        .filter(Boolean)
    )
  );
}

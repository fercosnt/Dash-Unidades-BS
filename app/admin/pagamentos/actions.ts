"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProjecaoRow = {
  clinica_id: string;
  clinica_nome: string;
  mes_recebimento: string;
  total_projetado: number;
  total_parcelas: number;
};

export type ProjecaoFilters = {
  clinica_id?: string;
  mes_inicio?: string; // YYYY-MM
  mes_fim?: string;   // YYYY-MM
};

export async function getProjecaoRecebimentos(
  filters: ProjecaoFilters = {}
): Promise<ProjecaoRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vw_recebimentos_futuros")
    .select("clinica_id, clinica_nome, mes_recebimento, total_projetado, total_parcelas");
  if (error) return [];

  let rows = (data ?? []) as ProjecaoRow[];
  if (filters.clinica_id) {
    rows = rows.filter((r) => r.clinica_id === filters.clinica_id);
  }
  if (filters.mes_inicio) {
    const inicio = filters.mes_inicio;
    rows = rows.filter((r) => String(r.mes_recebimento).slice(0, 7) >= inicio);
  }
  if (filters.mes_fim) {
    const fim = filters.mes_fim;
    rows = rows.filter((r) => String(r.mes_recebimento).slice(0, 7) <= fim);
  }
  rows.sort(
    (a, b) =>
      a.mes_recebimento.localeCompare(b.mes_recebimento) ||
      a.clinica_nome.localeCompare(b.clinica_nome)
  );
  return rows;
}

export async function getKpisProjecao(): Promise<{
  totalProjetado: number;
  quantidadeMeses: number;
  quantidadeParcelas: number;
}> {
  const rows = await getProjecaoRecebimentos({});
  const totalProjetado = rows.reduce((s, r) => s + Number(r.total_projetado), 0);
  const meses = new Set(rows.map((r) => r.mes_recebimento));
  const quantidadeParcelas = rows.reduce((s, r) => s + Number(r.total_parcelas || 0), 0);
  return {
    totalProjetado,
    quantidadeMeses: meses.size,
    quantidadeParcelas,
  };
}

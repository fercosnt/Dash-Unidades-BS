"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type InadimplenteRow = {
  orcamento_fechado_id: string;
  paciente_nome: string;
  clinica_id: string;
  clinica_nome: string;
  valor_total: number;
  valor_pago: number;
  valor_em_aberto: number;
  data_fechamento: string | null;
  status: string;
  dias_em_aberto: number | null;
};

export type InadimplenciaFilters = {
  clinica_id?: string;
  valor_min?: number;
  dias_min?: number;
  status?: "em_aberto" | "parcial";
};

export async function listInadimplentes(
  filters: InadimplenciaFilters = {}
): Promise<InadimplenteRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("vw_inadimplentes").select("*");
  if (error) return [];

  let rows = (data ?? []) as InadimplenteRow[];
  if (filters.clinica_id) {
    rows = rows.filter((r) => r.clinica_id === filters.clinica_id);
  }
  if (filters.valor_min != null) {
    rows = rows.filter((r) => r.valor_em_aberto >= filters.valor_min!);
  }
  if (filters.dias_min != null) {
    rows = rows.filter((r) => (r.dias_em_aberto ?? 0) >= filters.dias_min!);
  }
  if (filters.status) {
    rows = rows.filter((r) => r.status === filters.status);
  }
  rows.sort((a, b) => Number(b.valor_em_aberto) - Number(a.valor_em_aberto));
  return rows;
}

export async function getKpisInadimplencia(): Promise<{
  totalInadimplente: number;
  quantidadePacientes: number;
  maiorValor: number;
  mediaPorPaciente: number;
}> {
  const rows = await listInadimplentes({});
  const totalInadimplente = rows.reduce((s, r) => s + Number(r.valor_em_aberto), 0);
  const quantidadePacientes = rows.length;
  const maiorValor =
    rows.length === 0 ? 0 : Math.max(...rows.map((r) => Number(r.valor_em_aberto)));
  const mediaPorPaciente = quantidadePacientes === 0 ? 0 : totalInadimplente / quantidadePacientes;
  return {
    totalInadimplente,
    quantidadePacientes,
    maiorValor,
    mediaPorPaciente,
  };
}

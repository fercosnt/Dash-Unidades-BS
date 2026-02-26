"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrcamentoDetalhe = {
  id: string;
  paciente_nome: string;
  paciente_telefone: string | null;
  valor_total: number;
  valor_pago: number;
  valor_em_aberto: number;
  status: string;
  data_fechamento: string | null;
  profissional: string | null;
  procedimentos_texto: string | null;
  clinica_id: string;
  clinica_nome: string;
};

export type PagamentoRow = {
  id: string;
  valor: number;
  forma: string;
  parcelas: number;
  data_pagamento: string;
};

export async function getOrcamentoDetalhe(
  orcamentoFechadoId: string
): Promise<OrcamentoDetalhe | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orcamentos_fechados")
    .select(`
      id,
      paciente_nome,
      paciente_telefone,
      valor_total,
      valor_pago,
      valor_em_aberto,
      status,
      data_fechamento,
      profissional,
      procedimentos_texto,
      clinica_id,
      clinicas_parceiras(nome)
    `)
    .eq("id", orcamentoFechadoId)
    .single();

  if (error || !data) return null;

  type Row = {
    id: string;
    paciente_nome: string;
    paciente_telefone: string | null;
    valor_total: number;
    valor_pago: number;
    valor_em_aberto: number;
    status: string;
    data_fechamento: string | null;
    profissional: string | null;
    procedimentos_texto: string | null;
    clinica_id: string;
    clinicas_parceiras: { nome: string }[] | { nome: string } | null;
  };
  const row = data as Row;
  const clinicaNome =
    row.clinicas_parceiras == null
      ? "—"
      : Array.isArray(row.clinicas_parceiras)
        ? row.clinicas_parceiras[0]?.nome ?? "—"
        : row.clinicas_parceiras.nome ?? "—";
  return {
    id: row.id,
    paciente_nome: row.paciente_nome ?? "",
    paciente_telefone: row.paciente_telefone ?? null,
    valor_total: Number(row.valor_total),
    valor_pago: Number(row.valor_pago),
    valor_em_aberto: Number(row.valor_em_aberto),
    status: row.status ?? "em_aberto",
    data_fechamento: row.data_fechamento ?? null,
    profissional: row.profissional ?? null,
    procedimentos_texto: row.procedimentos_texto ?? null,
    clinica_id: row.clinica_id,
    clinica_nome: clinicaNome,
  };
}

export async function listPagamentosDoOrcamento(
  orcamentoFechadoId: string
): Promise<PagamentoRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pagamentos")
    .select("id, valor, forma, parcelas, data_pagamento")
    .eq("orcamento_fechado_id", orcamentoFechadoId)
    .order("data_pagamento", { ascending: false });

  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id,
    valor: Number(r.valor),
    forma: r.forma,
    parcelas: r.parcelas ?? 1,
    data_pagamento: r.data_pagamento,
  }));
}

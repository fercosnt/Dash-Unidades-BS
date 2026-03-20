"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/utils/date-helpers";

export type ClinicaInfo = {
  id: string;
  nome: string;
  cnpj: string | null;
  responsavel: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
};

export type ResumoClinica = {
  faturamentoBruto: number;
  totalCustosProcedimentos: number;
  totalCustoMaoDeObra: number;
  totalTaxaCartao: number;
  totalImpostoNf: number;
  totalComissoesMedicas: number;
  valorLiquido: number;
  valorBeautySmile: number;
  valorClinica: number;
  totalInadimplente: number;
};

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

export type TratamentoRow = {
  id: string;
  pacienteNome: string;
  procedimentoNome: string | null;
  procedimentoId: string | null;
  quantidade: number;
  dataExecucao: string | null;
  custoFixo: number | null;
};

export async function getClinicaById(id: string): Promise<ClinicaInfo | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clinicas_parceiras")
    .select("id, nome, cnpj, responsavel, email, telefone, ativo")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    nome: (r.nome as string) ?? "",
    cnpj: (r.cnpj as string) ?? null,
    responsavel: (r.responsavel as string) ?? null,
    email: (r.email as string) ?? null,
    telefone: (r.telefone as string) ?? null,
    ativo: (r.ativo as boolean) ?? true,
  };
}

export async function getResumoClinicaMes(
  clinicaId: string,
  mesRef: string
): Promise<ResumoClinica | null> {
  const supabase = await createSupabaseServerClient();
  const start = firstDayOfMonth(mesRef);
  const end = lastDayOfMonth(mesRef);
  const { data, error } = await supabase
    .from("resumo_mensal")
    .select("*")
    .eq("clinica_id", clinicaId)
    .gte("mes_referencia", start)
    .lte("mes_referencia", end)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  return {
    faturamentoBruto: Number(r.faturamento_bruto ?? 0),
    totalCustosProcedimentos: Number(r.total_custos_procedimentos ?? 0),
    totalCustoMaoDeObra: Number(r.total_custo_mao_obra ?? 0),
    totalTaxaCartao: Number(r.total_taxa_cartao ?? 0),
    totalImpostoNf: Number(r.total_imposto_nf ?? 0),
    totalComissoesMedicas: Number(r.total_comissoes_medicas ?? 0),
    valorLiquido: Number(r.valor_liquido ?? 0),
    valorBeautySmile: Number(r.valor_beauty_smile ?? 0),
    valorClinica: Number(r.valor_clinica ?? 0),
    totalInadimplente: Number(r.total_inadimplente ?? 0),
  };
}

export async function getOrcamentosFechadosClinicaMes(
  clinicaId: string,
  mesRef: string,
  statusFilter?: string
): Promise<OrcamentoFechadoRow[]> {
  const supabase = await createSupabaseServerClient();
  const start = firstDayOfMonth(mesRef);
  const end = lastDayOfMonth(mesRef);
  let q = supabase
    .from("orcamentos_fechados")
    .select("id, paciente_nome, valor_total, valor_pago, valor_em_aberto, status, data_fechamento, medico_indicador_id")
    .eq("clinica_id", clinicaId)
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

export async function getOrcamentosAbertosClinicaMes(
  clinicaId: string,
  mesRef: string
): Promise<OrcamentoAbertoRow[]> {
  const supabase = await createSupabaseServerClient();
  const start = firstDayOfMonth(mesRef);
  const end = lastDayOfMonth(mesRef);
  const { data, error } = await supabase
    .from("orcamentos_abertos")
    .select("id, paciente_nome, valor_total, status, data_criacao")
    .eq("clinica_id", clinicaId)
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

export async function getTratamentosClinicaMes(
  clinicaId: string,
  mesRef: string
): Promise<TratamentoRow[]> {
  const supabase = await createSupabaseServerClient();
  const start = firstDayOfMonth(mesRef);
  const end = lastDayOfMonth(mesRef);
  const { data, error } = await supabase
    .from("tratamentos_executados")
    .select("id, paciente_nome, procedimento_nome, procedimento_id, quantidade, data_execucao, procedimentos(custo_fixo)")
    .eq("clinica_id", clinicaId)
    .gte("mes_referencia", start)
    .lte("mes_referencia", end)
    .order("data_execucao", { ascending: false });
  if (error) return [];
  type Row = {
    id: string;
    paciente_nome: string;
    procedimento_nome: string;
    procedimento_id: string | null;
    quantidade: number;
    data_execucao: string | null;
    procedimentos: { custo_fixo: number }[] | { custo_fixo: number } | null;
  };
  const rows = (data ?? []) as Row[];
  return rows.map((row) => {
    const proc = row.procedimentos;
    const custoFixoVal =
      proc == null
        ? null
        : Array.isArray(proc)
          ? proc[0]?.custo_fixo ?? null
          : (proc as { custo_fixo: number }).custo_fixo;
    return {
      id: row.id,
      pacienteNome: row.paciente_nome ?? "",
      procedimentoNome: row.procedimento_nome ?? null,
      procedimentoId: row.procedimento_id,
      quantidade: Number(row.quantidade ?? 1),
      dataExecucao: row.data_execucao,
      custoFixo: custoFixoVal != null ? Number(custoFixoVal) : null,
    };
  });
}

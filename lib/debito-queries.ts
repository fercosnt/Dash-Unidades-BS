"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DebitoItem = {
  id: string;
  clinicaId: string;
  clinicaNome: string;
  descricao: string;
  valorTotal: number;
  valorPago: number;
  saldoRestante: number;
  dataInicio: string;
  status: string;
};

export async function fetchDebitosAtivos(): Promise<DebitoItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("debito_parceiro")
    .select("id, clinica_id, descricao, valor_total, valor_pago, data_inicio, status, clinicas_parceiras(nome)")
    .eq("status", "ativo")
    .order("data_inicio", { ascending: false });

  type Row = {
    id: string;
    clinica_id: string;
    descricao: string;
    valor_total: number;
    valor_pago: number;
    data_inicio: string;
    status: string;
    clinicas_parceiras: { nome: string } | { nome: string }[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => {
    const cp = r.clinicas_parceiras;
    const clinica = Array.isArray(cp) ? cp[0] : cp;
    return {
      id: r.id,
      clinicaId: r.clinica_id,
      clinicaNome: clinica?.nome ?? "—",
      descricao: r.descricao,
      valorTotal: Number(r.valor_total),
      valorPago: Number(r.valor_pago),
      saldoRestante: Number(r.valor_total) - Number(r.valor_pago),
      dataInicio: r.data_inicio,
      status: r.status,
    };
  });
}

export async function fetchDebitoPorClinica(clinicaId: string): Promise<DebitoItem | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("debito_parceiro")
    .select("id, clinica_id, descricao, valor_total, valor_pago, data_inicio, status")
    .eq("clinica_id", clinicaId)
    .eq("status", "ativo")
    .maybeSingle();

  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    clinicaId: r.clinica_id as string,
    clinicaNome: "",
    descricao: r.descricao as string,
    valorTotal: Number(r.valor_total),
    valorPago: Number(r.valor_pago),
    saldoRestante: Number(r.valor_total) - Number(r.valor_pago),
    dataInicio: r.data_inicio as string,
    status: r.status as string,
  };
}

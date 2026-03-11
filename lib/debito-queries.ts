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

export type AbatimentoHistoricoItem = {
  id: string;
  valorAbatido: number;
  mesReferencia: string;
  createdAt: string;
  origem: string;
};

export async function fetchAbatimentosPorDebito(debitoId: string): Promise<AbatimentoHistoricoItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("abatimentos_debito")
    .select("id, valor_abatido, mes_referencia, created_at, repasse_id, repasses_mensais(mes_referencia)")
    .eq("debito_id", debitoId)
    .order("created_at", { ascending: false });

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  type Row = {
    id: string;
    valor_abatido: number;
    mes_referencia: string;
    created_at: string;
    repasse_id: string | null;
    repasses_mensais: { mes_referencia: string } | { mes_referencia: string }[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => {
    let origem = "Direto";
    if (r.repasse_id) {
      const rp = r.repasses_mensais;
      const repasse = Array.isArray(rp) ? rp[0] : rp;
      if (repasse) {
        const [y, mo] = (repasse.mes_referencia as string).slice(0, 7).split("-");
        origem = `Repasse ${months[Number(mo) - 1]}/${y}`;
      } else {
        origem = "Repasse";
      }
    }
    return {
      id: r.id,
      valorAbatido: Number(r.valor_abatido),
      mesReferencia: r.mes_referencia.slice(0, 7),
      createdAt: r.created_at,
      origem,
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

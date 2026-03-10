"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RepasseItem = {
  id: string;
  clinicaId: string;
  clinicaNome: string;
  mesReferencia: string;
  valorRepasse: number;
  dataTransferencia: string;
  observacao: string | null;
  status: string;
};

export type RepassePendente = {
  clinicaId: string;
  clinicaNome: string;
  mesReferencia: string;
  valorCalculado: number; // from resumo_mensal
};

export async function fetchRepassesPendentes(): Promise<RepassePendente[]> {
  const supabase = await createSupabaseServerClient();
  // Get all resumo_mensal records that don't have a repasse yet
  const { data: resumos } = await supabase
    .from("resumo_mensal")
    .select("clinica_id, mes_referencia, valor_clinica, clinicas_parceiras(nome)")
    .order("mes_referencia", { ascending: false });

  const { data: jaFeitos } = await supabase
    .from("repasses_mensais")
    .select("clinica_id, mes_referencia");

  const feitos = new Set(
    (jaFeitos ?? []).map((r) => `${r.clinica_id}|${(r.mes_referencia as string).slice(0, 7)}`)
  );

  type Row = {
    clinica_id: string;
    mes_referencia: string;
    valor_clinica: number;
    clinicas_parceiras: { nome: string } | { nome: string }[] | null;
  };

  return ((resumos ?? []) as unknown as Row[])
    .filter((r) => !feitos.has(`${r.clinica_id}|${r.mes_referencia.slice(0, 7)}`))
    .map((r) => {
      const cp = r.clinicas_parceiras;
      const clinica = Array.isArray(cp) ? cp[0] : cp;
      return {
        clinicaId: r.clinica_id,
        clinicaNome: clinica?.nome ?? "—",
        mesReferencia: r.mes_referencia.slice(0, 7),
        valorCalculado: Number(r.valor_clinica ?? 0),
      };
    });
}

export async function fetchRepassesFeitos(): Promise<RepasseItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("repasses_mensais")
    .select(
      "id, clinica_id, mes_referencia, valor_repasse, data_transferencia, observacao, status, clinicas_parceiras(nome)"
    )
    .order("mes_referencia", { ascending: false });

  type Row = {
    id: string;
    clinica_id: string;
    mes_referencia: string;
    valor_repasse: number;
    data_transferencia: string;
    observacao: string | null;
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
      mesReferencia: r.mes_referencia.slice(0, 7),
      valorRepasse: Number(r.valor_repasse),
      dataTransferencia: r.data_transferencia,
      observacao: r.observacao,
      status: r.status,
    };
  });
}

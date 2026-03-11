"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ComissaoMedicoItem = {
  id: string;
  medicoId: string;
  medicoNome: string;
  clinicaId: string;
  clinicaNome: string;
  mesReferencia: string;
  valorComissao: number;
  status: string;
  dataPagamento: string | null;
  observacao: string | null;
  createdAt: string;
};

export async function fetchComissoesMedicos(params?: {
  mes?: string;
  clinicaId?: string;
  medicoId?: string;
  status?: string;
}): Promise<ComissaoMedicoItem[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("pagamentos_comissao")
    .select(
      "id, medico_indicador_id, clinica_id, mes_referencia, valor_comissao, status, data_pagamento, observacao, created_at, medicos_indicadores(nome), clinicas_parceiras(nome)"
    )
    .order("mes_referencia", { ascending: false })
    .order("created_at", { ascending: false });

  if (params?.mes) query = query.eq("mes_referencia", params.mes);
  if (params?.clinicaId) query = query.eq("clinica_id", params.clinicaId);
  if (params?.medicoId) query = query.eq("medico_indicador_id", params.medicoId);
  if (params?.status) query = query.eq("status", params.status);

  const { data } = await query;

  type Row = {
    id: string;
    medico_indicador_id: string;
    clinica_id: string;
    mes_referencia: string;
    valor_comissao: number;
    status: string;
    data_pagamento: string | null;
    observacao: string | null;
    created_at: string;
    medicos_indicadores: { nome: string } | { nome: string }[] | null;
    clinicas_parceiras: { nome: string } | { nome: string }[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => {
    const mi = r.medicos_indicadores;
    const medico = Array.isArray(mi) ? mi[0] : mi;
    const cp = r.clinicas_parceiras;
    const clinica = Array.isArray(cp) ? cp[0] : cp;
    return {
      id: r.id,
      medicoId: r.medico_indicador_id,
      medicoNome: medico?.nome ?? "—",
      clinicaId: r.clinica_id,
      clinicaNome: clinica?.nome ?? "—",
      mesReferencia: r.mes_referencia,
      valorComissao: Number(r.valor_comissao),
      status: r.status,
      dataPagamento: r.data_pagamento,
      observacao: r.observacao,
      createdAt: r.created_at,
    };
  });
}

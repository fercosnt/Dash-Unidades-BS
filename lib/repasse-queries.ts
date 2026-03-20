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
  const { data: resumos, error: errResumos } = await supabase
    .from("resumo_mensal")
    .select("clinica_id, mes_referencia, total_recebido_mes, total_taxa_cartao, total_imposto_nf, total_custo_mao_obra, total_custos_procedimentos, total_comissoes_medicas, clinicas_parceiras(nome)")
    .order("mes_referencia", { ascending: false });
  if (errResumos) {
    console.error("[fetchRepassesPendentes] Erro ao buscar resumo_mensal:", errResumos.message);
    return [];
  }

  const { data: jaFeitos, error: errFeitos } = await supabase
    .from("repasses_mensais")
    .select("clinica_id, mes_referencia");
  if (errFeitos) {
    console.error("[fetchRepassesPendentes] Erro ao buscar repasses_mensais:", errFeitos.message);
    return [];
  }

  const { data: configData, error: errConfig } = await supabase
    .from("configuracoes_financeiras")
    .select("percentual_beauty_smile")
    .is("vigencia_fim", null)
    .single();
  if (errConfig) {
    console.error("[fetchRepassesPendentes] Erro ao buscar configuracoes_financeiras:", errConfig.message);
    return [];
  }

  const percentualBS = Number(configData?.percentual_beauty_smile ?? 60) / 100;

  const feitos = new Set(
    (jaFeitos ?? []).map((r) => `${r.clinica_id}|${(r.mes_referencia as string).slice(0, 7)}`)
  );

  type Row = {
    clinica_id: string;
    mes_referencia: string;
    total_recebido_mes: number;
    total_taxa_cartao: number;
    total_imposto_nf: number;
    total_custo_mao_obra: number;
    total_custos_procedimentos: number;
    total_comissoes_medicas: number;
    clinicas_parceiras: { nome: string } | { nome: string }[] | null;
  };

  return ((resumos ?? []) as unknown as Row[])
    .filter((r) => !feitos.has(`${r.clinica_id}|${r.mes_referencia.slice(0, 7)}`))
    .map((r) => {
      const cp = r.clinicas_parceiras;
      const clinica = Array.isArray(cp) ? cp[0] : cp;
      // Base caixa: calcular sobre o que foi efetivamente recebido
      const totalRecebido = Number(r.total_recebido_mes ?? 0);
      const disponivel = totalRecebido
        - Number(r.total_taxa_cartao ?? 0)
        - Number(r.total_imposto_nf ?? 0)
        - Number(r.total_custo_mao_obra ?? 0)
        - Number(r.total_custos_procedimentos ?? 0)
        - Number(r.total_comissoes_medicas ?? 0);
      const valorRepassar = Math.round(disponivel * (1 - percentualBS) * 100) / 100;
      return {
        clinicaId: r.clinica_id,
        clinicaNome: clinica?.nome ?? "—",
        mesReferencia: r.mes_referencia.slice(0, 7),
        valorCalculado: valorRepassar,
      };
    });
}

export async function fetchRepassesFeitos(): Promise<RepasseItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("repasses_mensais")
    .select(
      "id, clinica_id, mes_referencia, valor_repasse, data_transferencia, observacao, status, clinicas_parceiras(nome)"
    )
    .order("mes_referencia", { ascending: false });

  if (error) {
    console.error("[fetchRepassesFeitos] Erro ao buscar repasses_mensais:", error.message);
    return [];
  }

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

"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ComissaoDentistaItem = {
  id: string;
  clinicaId: string;
  clinicaNome: string;
  dentistaId: string | null;
  dentistaNome: string | null;
  mesReferencia: string;
  qtdeVendas: number;
  tierAplicado: number;
  percentual: number;
  baseCalculo: number;
  valorComissao: number;
  status: string;
  dataPagamento: string | null;
  observacao: string | null;
};

export type ConfigComissaoDentista = {
  id: string;
  tier1Limite: number;
  tier1Percentual: number;
  tier2Limite: number;
  tier2Percentual: number;
  tier3Percentual: number;
};

export async function fetchConfigComissaoDentista(): Promise<ConfigComissaoDentista | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("config_comissao_dentista")
    .select("*")
    .is("vigencia_fim", null)
    .maybeSingle();

  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    tier1Limite: Number(r.tier1_limite),
    tier1Percentual: Number(r.tier1_percentual),
    tier2Limite: Number(r.tier2_limite),
    tier2Percentual: Number(r.tier2_percentual),
    tier3Percentual: Number(r.tier3_percentual),
  };
}

export async function fetchComissoesDentista(mes?: string, status?: string): Promise<ComissaoDentistaItem[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("comissoes_dentista")
    .select("id, clinica_id, dentista_id, mes_referencia, qtde_vendas, tier_aplicado, percentual, base_calculo, valor_comissao, status, data_pagamento, observacao, clinicas_parceiras(nome), dentistas(nome)")
    .order("mes_referencia", { ascending: false });

  if (mes && mes !== "all") {
    const start = `${mes}-01`;
    const [y, m] = mes.split("-").map(Number);
    const end = `${mes}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    query = query.gte("mes_referencia", start).lte("mes_referencia", end);
  }
  if (status) query = query.eq("status", status);

  const { data } = await query;

  type Row = {
    id: string;
    clinica_id: string;
    dentista_id: string | null;
    mes_referencia: string;
    qtde_vendas: number;
    tier_aplicado: number;
    percentual: number;
    base_calculo: number;
    valor_comissao: number;
    status: string;
    data_pagamento: string | null;
    observacao: string | null;
    clinicas_parceiras: { nome: string } | { nome: string }[] | null;
    dentistas: { nome: string } | { nome: string }[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => {
    const cp = r.clinicas_parceiras;
    const clinica = Array.isArray(cp) ? cp[0] : cp;
    const dp = r.dentistas;
    const dentista = Array.isArray(dp) ? dp[0] : dp;
    return {
      id: r.id,
      clinicaId: r.clinica_id,
      clinicaNome: clinica?.nome ?? "—",
      dentistaId: r.dentista_id,
      dentistaNome: dentista?.nome ?? null,
      mesReferencia: r.mes_referencia.slice(0, 7),
      qtdeVendas: r.qtde_vendas,
      tierAplicado: r.tier_aplicado,
      percentual: Number(r.percentual),
      baseCalculo: Number(r.base_calculo),
      valorComissao: Number(r.valor_comissao),
      status: r.status,
      dataPagamento: r.data_pagamento,
      observacao: r.observacao,
    };
  });
}

export async function calcularComissaoDentista(dentistaId: string, mes: string) {
  const supabase = await createSupabaseServerClient();

  // Get dentista to find clinica_id
  const { data: dentistaData } = await supabase
    .from("dentistas")
    .select("id, clinica_id")
    .eq("id", dentistaId)
    .eq("ativo", true)
    .maybeSingle();

  if (!dentistaData) return { ok: false, error: "Dentista não encontrada ou inativa." };
  const clinicaId = (dentistaData as Record<string, unknown>).clinica_id as string;

  const start = `${mes}-01`;
  const [y, m] = mes.split("-").map(Number);
  const end = `${mes}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  const [configRes, vendas, resumo] = await Promise.all([
    supabase.from("config_comissao_dentista").select("*").is("vigencia_fim", null).maybeSingle(),
    supabase
      .from("orcamentos_fechados")
      .select("id")
      .eq("clinica_id", clinicaId)
      .gte("mes_referencia", start)
      .lte("mes_referencia", end),
    supabase
      .from("resumo_mensal")
      .select("faturamento_bruto")
      .eq("clinica_id", clinicaId)
      .gte("mes_referencia", start)
      .lte("mes_referencia", end)
      .maybeSingle(),
  ]);

  const config = configRes.data as Record<string, unknown> | null;
  if (!config) return { ok: false, error: "Configuração de tiers não encontrada." };

  const qtdeVendas = (vendas.data ?? []).length;
  const faturamentoBruto = Number((resumo.data as Record<string, unknown> | null)?.faturamento_bruto ?? 0);

  let tierAplicado = 3;
  let percentual = Number(config.tier3_percentual);
  if (qtdeVendas <= Number(config.tier1_limite)) {
    tierAplicado = 1;
    percentual = Number(config.tier1_percentual);
  } else if (qtdeVendas <= Number(config.tier2_limite)) {
    tierAplicado = 2;
    percentual = Number(config.tier2_percentual);
  }

  const valorComissao = faturamentoBruto * (percentual / 100);

  const { error } = await supabase.from("comissoes_dentista").upsert(
    {
      clinica_id: clinicaId,
      dentista_id: dentistaId,
      mes_referencia: start,
      qtde_vendas: qtdeVendas,
      tier_aplicado: tierAplicado,
      percentual,
      base_calculo: faturamentoBruto,
      valor_comissao: valorComissao,
      config_id: config.id as string,
    },
    { onConflict: "clinica_id,mes_referencia" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true, valorComissao, tier: tierAplicado };
}

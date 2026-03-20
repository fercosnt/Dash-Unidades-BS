"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/utils/date-helpers";
import type {
  KpisAdmin,
  RankingClinica,
  UploadStatusItem,
  KpisParceiro,
  ChartParceiroPoint,
  ChartDataAdminPoint,
  ChartLiquidoAdminPoint,
  KpisAdminV2,
  DreAdminData,
  RepasseAdminData,
  OrcamentoFechadoItem,
  OrcamentoAbertoItem,
  ProcedimentoRankingItem,
  ChartVendasPoint,
  TratamentoVendidoItem,
  TratamentosEvolucaoData,
} from "@/types/dashboard.types";


export async function fetchKpisAdmin(mesReferencia: string): Promise<KpisAdmin> {
  const supabase = await createSupabaseServerClient();

  if (mesReferencia === "all") {
    return fetchKpisAdminResumoGeral(supabase);
  }

  let query = supabase
    .from("resumo_mensal")
    .select("faturamento_bruto, total_recebido_mes, total_a_receber_mes, total_inadimplente, valor_liquido, valor_beauty_smile")
    .gte("mes_referencia", firstDayOfMonth(mesReferencia))
    .lte("mes_referencia", lastDayOfMonth(mesReferencia));

  const { data, error } = await query;

  if (error || !data?.length) {
    return {
      faturamentoBruto: 0,
      totalRecebidoMes: 0,
      totalAReceberMes: 0,
      totalInadimplente: 0,
      valorLiquido: 0,
      valorBeautySmile: 0,
      resumoCalculado: false,
    };
  }

  const sum = (key: string) =>
    data.reduce((acc, row) => acc + Number((row as Record<string, unknown>)[key] ?? 0), 0);

  return {
    faturamentoBruto: sum("faturamento_bruto"),
    totalRecebidoMes: sum("total_recebido_mes"),
    totalAReceberMes: sum("total_a_receber_mes"),
    totalInadimplente: sum("total_inadimplente"),
    valorLiquido: sum("valor_liquido"),
    valorBeautySmile: sum("valor_beauty_smile"),
    resumoCalculado: true,
  };
}

/** Resumo Geral: agrega todas as clínicas a partir dos dados brutos (sem depender de resumo_mensal calculado). */
async function fetchKpisAdminResumoGeral(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<KpisAdmin> {
  const { data: orcamentos } = await supabase
    .from("orcamentos_fechados")
    .select("valor_total, valor_em_aberto, valor_pago, status");

  let faturamentoBruto = 0;
  let totalAReceberMes = 0;
  let totalInadimplente = 0;
  (orcamentos ?? []).forEach((r: Record<string, unknown>) => {
    const total = Number(r.valor_total ?? 0);
    const emAberto = Number(r.valor_em_aberto ?? 0);
    faturamentoBruto += total;
    totalAReceberMes += emAberto;
    const st = String(r.status ?? "");
    if (st === "em_aberto" || st === "parcial") {
      totalInadimplente += emAberto;
    }
  });

  const formasCartao = ["cartao_credito", "cartao_debito"];
  const { data: pagamentos } = await supabase.from("pagamentos").select("valor, forma");
  let totalRecebidoDireto = 0;
  (pagamentos ?? []).forEach((r: Record<string, unknown>) => {
    if (formasCartao.includes(String(r.forma ?? ""))) return;
    totalRecebidoDireto += Number(r.valor ?? 0);
  });

  const { data: parcelas } = await supabase
    .from("parcelas_cartao")
    .select("valor_parcela")
    .eq("status", "recebido");
  const totalRecebidoParcelas = (parcelas ?? []).reduce((s, r: Record<string, unknown>) => s + Number(r.valor_parcela ?? 0), 0);
  const totalRecebidoMes = Math.round((totalRecebidoDireto + totalRecebidoParcelas) * 100) / 100;

  const { data: resumoRows } = await supabase
    .from("resumo_mensal")
    .select("valor_liquido, valor_beauty_smile");
  let valorLiquido = 0;
  let valorBeautySmile = 0;
  (resumoRows ?? []).forEach((r: Record<string, unknown>) => {
    valorLiquido += Number(r.valor_liquido ?? 0);
    valorBeautySmile += Number(r.valor_beauty_smile ?? 0);
  });

  return {
    faturamentoBruto: Math.round(faturamentoBruto * 100) / 100,
    totalRecebidoMes,
    totalAReceberMes: Math.round(totalAReceberMes * 100) / 100,
    totalInadimplente: Math.round(totalInadimplente * 100) / 100,
    valorLiquido: Math.round(valorLiquido * 100) / 100,
    valorBeautySmile: Math.round(valorBeautySmile * 100) / 100,
    resumoCalculado: true,
  };
}

export async function fetchRankingClinicas(mesReferencia: string, clinicaId?: string): Promise<RankingClinica[]> {
  const supabase = await createSupabaseServerClient();

  if (mesReferencia === "all") {
    return fetchRankingClinicasResumoGeral(supabase);
  }

  const start = firstDayOfMonth(mesReferencia);
  const end = lastDayOfMonth(mesReferencia);
  let query = supabase
    .from("resumo_mensal")
    .select(`
      clinica_id,
      faturamento_bruto,
      valor_liquido,
      valor_beauty_smile,
      valor_clinica,
      clinicas_parceiras(nome, ativo)
    `)
    .gte("mes_referencia", start)
    .lte("mes_referencia", end)
    .order("faturamento_bruto", { ascending: false });

  if (clinicaId) query = query.eq("clinica_id", clinicaId);

  const { data, error } = await query;

  if (error) return [];

  type Row = {
    clinica_id: string;
    faturamento_bruto: number;
    valor_liquido: number;
    valor_beauty_smile: number;
    valor_clinica: number;
    clinicas_parceiras: { nome: string; ativo: boolean }[] | { nome: string; ativo: boolean } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => {
    const cp = r.clinicas_parceiras;
    const clinica = Array.isArray(cp) ? cp[0] : cp;
    return {
      clinicaId: r.clinica_id,
      clinicaNome: clinica?.nome ?? "—",
      faturamentoBruto: Number(r.faturamento_bruto ?? 0),
      valorLiquido: Number(r.valor_liquido ?? 0),
      valorBeautySmile: Number(r.valor_beauty_smile ?? 0),
      valorClinica: Number(r.valor_clinica ?? 0),
      ativo: clinica?.ativo ?? true,
    };
  });
}

/** Ranking no Resumo Geral: faturamento de orcamentos_fechados por clínica + valores de resumo_mensal quando existirem. */
async function fetchRankingClinicasResumoGeral(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<RankingClinica[]> {
  const { data: clinicas } = await supabase
    .from("clinicas_parceiras")
    .select("id, nome, ativo")
    .order("nome");
  if (!clinicas?.length) return [];

  const { data: orcamentos } = await supabase
    .from("orcamentos_fechados")
    .select("clinica_id, valor_total");
  const faturamentoByClinica: Record<string, number> = {};
  clinicas.forEach((c) => { faturamentoByClinica[c.id] = 0; });
  (orcamentos ?? []).forEach((r: Record<string, unknown>) => {
    const id = r.clinica_id as string;
    if (faturamentoByClinica[id] != null) {
      faturamentoByClinica[id] += Number(r.valor_total ?? 0);
    }
  });

  const { data: resumoRows } = await supabase.from("resumo_mensal").select("clinica_id, valor_liquido, valor_beauty_smile, valor_clinica");
  const resumoByClinica: Record<string, { valorLiquido: number; valorBeautySmile: number; valorClinica: number }> = {};
  clinicas.forEach((c) => { resumoByClinica[c.id] = { valorLiquido: 0, valorBeautySmile: 0, valorClinica: 0 }; });
  (resumoRows ?? []).forEach((r: Record<string, unknown>) => {
    const id = r.clinica_id as string;
    if (resumoByClinica[id]) {
      resumoByClinica[id].valorLiquido += Number(r.valor_liquido ?? 0);
      resumoByClinica[id].valorBeautySmile += Number(r.valor_beauty_smile ?? 0);
      resumoByClinica[id].valorClinica += Number(r.valor_clinica ?? 0);
    }
  });

  return clinicas
    .map((c) => ({
      clinicaId: c.id,
      clinicaNome: c.nome ?? "—",
      faturamentoBruto: Math.round((faturamentoByClinica[c.id] ?? 0) * 100) / 100,
      valorLiquido: resumoByClinica[c.id]?.valorLiquido ?? 0,
      valorBeautySmile: resumoByClinica[c.id]?.valorBeautySmile ?? 0,
      valorClinica: resumoByClinica[c.id]?.valorClinica ?? 0,
      ativo: c.ativo ?? true,
    }))
    .sort((a, b) => b.faturamentoBruto - a.faturamentoBruto);
}

export async function fetchStatusUploads(mesReferencia: string, clinicaId?: string): Promise<UploadStatusItem[]> {
  const supabase = await createSupabaseServerClient();
  let clinicasQuery = supabase
    .from("clinicas_parceiras")
    .select("id, nome")
    .order("nome");
  if (clinicaId) clinicasQuery = clinicasQuery.eq("id", clinicaId);
  const { data: clinicas, error: errClinicas } = await clinicasQuery;
  if (errClinicas) {
    console.error("[fetchStatusUploads] Erro ao buscar clinicas_parceiras:", errClinicas.message);
    return [];
  }

  let query = supabase
    .from("upload_batches")
    .select("clinica_id, tipo")
    .eq("status", "concluido");

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    query = query.gte("mes_referencia", start).lte("mes_referencia", end);
  }

  const { data: batches, error: errBatches } = await query;
  if (errBatches) {
    console.error("[fetchStatusUploads] Erro ao buscar upload_batches:", errBatches.message);
    return [];
  }

  const byClinica: Record<string, { orcamentosFechados: boolean; orcamentosAbertos: boolean; tratamentos: boolean }> = {};
  (clinicas ?? []).forEach((c) => {
    byClinica[c.id] = { orcamentosFechados: false, orcamentosAbertos: false, tratamentos: false };
  });
  (batches ?? []).forEach((b) => {
    const id = b.clinica_id as string;
    if (!byClinica[id]) return;
    if (b.tipo === "orcamentos_fechados") byClinica[id].orcamentosFechados = true;
    if (b.tipo === "orcamentos_abertos") byClinica[id].orcamentosAbertos = true;
    if (b.tipo === "tratamentos_executados") byClinica[id].tratamentos = true;
  });

  return (clinicas ?? []).map((c) => ({
    clinicaId: c.id,
    clinicaNome: c.nome,
    orcamentosFechados: byClinica[c.id]?.orcamentosFechados ?? false,
    orcamentosAbertos: byClinica[c.id]?.orcamentosAbertos ?? false,
    tratamentos: byClinica[c.id]?.tratamentos ?? false,
  }));
}

/** KPIs do parceiro para o mês (RLS filtra pela clínica do usuário) */
export async function fetchKpisParceiro(mesReferencia: string): Promise<KpisParceiro> {
  const supabase = await createSupabaseServerClient();
  const baseQuery = supabase
    .from("resumo_mensal")
    .select("faturamento_bruto, valor_liquido, valor_clinica, total_inadimplente");

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    const { data, error } = await baseQuery.gte("mes_referencia", start).lte("mes_referencia", end).maybeSingle();

    if (error || !data) {
      return {
        faturamentoBruto: 0,
        valorLiquido: 0,
        valorClinica: 0,
        totalInadimplente: 0,
        resumoDisponivel: false,
      };
    }

    const r = data as Record<string, unknown>;
    return {
      faturamentoBruto: Number(r.faturamento_bruto ?? 0),
      valorLiquido: Number(r.valor_liquido ?? 0),
      valorClinica: Number(r.valor_clinica ?? 0),
      totalInadimplente: Number(r.total_inadimplente ?? 0),
      resumoDisponivel: true,
    };
  }

  const { data, error } = await baseQuery;
  if (error || !data?.length) {
    return {
      faturamentoBruto: 0,
      valorLiquido: 0,
      valorClinica: 0,
      totalInadimplente: 0,
      resumoDisponivel: false,
    };
  }

  const sum = (key: string) =>
    (data ?? []).reduce(
      (acc, row) => acc + Number((row as Record<string, unknown>)[key] ?? 0),
      0,
    );

  return {
    faturamentoBruto: sum("faturamento_bruto"),
    valorLiquido: sum("valor_liquido"),
    valorClinica: sum("valor_clinica"),
    totalInadimplente: sum("total_inadimplente"),
    resumoDisponivel: true,
  };
}

/** Dados para gráfico parceiro: últimos N meses (RLS filtra pela clínica) */
export async function fetchChartParceiro(mesesAtras: number = 6): Promise<ChartParceiroPoint[]> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const points: ChartParceiroPoint[] = [];
  for (let i = mesesAtras - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    points.push({ mesReferencia: `${y}-${m}`, faturamentoBruto: 0, valorClinica: 0 });
  }

  const start = points[0]!.mesReferencia + "-01";
  const endLast = points[points.length - 1]!.mesReferencia;
  const [y, m] = endLast.split("-").map(Number);
  const end = `${endLast}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("resumo_mensal")
    .select("mes_referencia, faturamento_bruto, valor_clinica")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);

  if (!error && data?.length) {
    const byMes: Record<string, { faturamentoBruto: number; valorClinica: number }> = {};
    data.forEach((r: Record<string, unknown>) => {
      const mes = (r.mes_referencia as string).slice(0, 7);
      byMes[mes] = {
        faturamentoBruto: Number(r.faturamento_bruto ?? 0),
        valorClinica: Number(r.valor_clinica ?? 0),
      };
    });
    points.forEach((p) => {
      const v = byMes[p.mesReferencia];
      if (v) {
        p.faturamentoBruto = v.faturamentoBruto;
        p.valorClinica = v.valorClinica;
      }
    });
  }

  return points;
}

/** Últimos N meses até o mês de referência (admin): Faturamento Bruto e Total Recebido por mês */
export async function fetchChartDataAdmin(
  mesReferencia: string,
  mesesAtras: number = 12,
  clinicaId?: string
): Promise<ChartDataAdminPoint[]> {
  const supabase = await createSupabaseServerClient();
  const [y, m] = mesReferencia.split("-").map(Number);
  const points: ChartDataAdminPoint[] = [];
  for (let i = mesesAtras - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    points.push({ mesReferencia: `${yy}-${mm}`, faturamentoBruto: 0, totalRecebidoMes: 0 });
  }
  const start = points[0]!.mesReferencia + "-01";
  const endLast = points[points.length - 1]!.mesReferencia;
  const [ey, em] = endLast.split("-").map(Number);
  const end = `${endLast}-${String(new Date(ey, em, 0).getDate()).padStart(2, "0")}`;

  let query = supabase
    .from("resumo_mensal")
    .select("mes_referencia, faturamento_bruto, total_recebido_mes")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);
  if (clinicaId) query = query.eq("clinica_id", clinicaId);
  const { data, error } = await query;

  if (!error && data?.length) {
    const byMes: Record<string, { faturamentoBruto: number; totalRecebidoMes: number }> = {};
    data.forEach((r: Record<string, unknown>) => {
      const mes = (r.mes_referencia as string).slice(0, 7);
      if (!byMes[mes]) byMes[mes] = { faturamentoBruto: 0, totalRecebidoMes: 0 };
      byMes[mes]!.faturamentoBruto += Number(r.faturamento_bruto ?? 0);
      byMes[mes]!.totalRecebidoMes += Number(r.total_recebido_mes ?? 0);
    });
    points.forEach((p) => {
      const v = byMes[p.mesReferencia];
      if (v) {
        p.faturamentoBruto = v.faturamentoBruto;
        p.totalRecebidoMes = v.totalRecebidoMes;
      }
    });
  }
  return points;
}

/** Últimos N meses até o mês de referência (admin): Valor Líquido por mês */
export async function fetchChartLiquidoAdmin(
  mesReferencia: string,
  mesesAtras: number = 12,
  clinicaId?: string
): Promise<ChartLiquidoAdminPoint[]> {
  const supabase = await createSupabaseServerClient();
  const [y, m] = mesReferencia.split("-").map(Number);
  const points: ChartLiquidoAdminPoint[] = [];
  for (let i = mesesAtras - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    points.push({ mesReferencia: `${yy}-${mm}`, valorLiquido: 0 });
  }
  const start = points[0]!.mesReferencia + "-01";
  const endLast = points[points.length - 1]!.mesReferencia;
  const [ey, em] = endLast.split("-").map(Number);
  const end = `${endLast}-${String(new Date(ey, em, 0).getDate()).padStart(2, "0")}`;

  let query = supabase
    .from("resumo_mensal")
    .select("mes_referencia, valor_liquido")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);
  if (clinicaId) query = query.eq("clinica_id", clinicaId);
  const { data, error } = await query;

  if (!error && data?.length) {
    const byMes: Record<string, number> = {};
    data.forEach((r: Record<string, unknown>) => {
      const mes = (r.mes_referencia as string).slice(0, 7);
      byMes[mes] = (byMes[mes] ?? 0) + Number(r.valor_liquido ?? 0);
    });
    points.forEach((p) => {
      const v = byMes[p.mesReferencia];
      if (v != null) p.valorLiquido = v;
    });
  }
  return points;
}

/** KPIs V2 — financeiros + operacionais (resumo_mensal + contagens de orçamentos/tratamentos) */
export async function fetchKpisAdminV2(mesReferencia: string, clinicaId?: string): Promise<KpisAdminV2> {
  const supabase = await createSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addDateFilter = (q: any, col = "mes_referencia") => {
    if (mesReferencia === "all") return q;
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    return q.gte(col, start).lte(col, end);
  };

  let resumoQ = addDateFilter(
    supabase.from("resumo_mensal").select(
      "faturamento_bruto, total_recebido_mes, total_a_receber_mes, total_inadimplente, valor_liquido, valor_beauty_smile, total_imposto_nf, total_taxa_cartao, total_custo_mao_obra, total_custos_procedimentos, total_comissoes_medicas"
    )
  );
  let fechadosQ = addDateFilter(supabase.from("orcamentos_fechados").select("id, valor_total"));
  let abertosQ = addDateFilter(supabase.from("orcamentos_abertos").select("id, valor_total"));
  let tratamentosQ = addDateFilter(supabase.from("tratamentos_executados").select("id"));

  if (clinicaId) {
    resumoQ = resumoQ.eq("clinica_id", clinicaId);
    fechadosQ = fechadosQ.eq("clinica_id", clinicaId);
    abertosQ = abertosQ.eq("clinica_id", clinicaId);
    tratamentosQ = tratamentosQ.eq("clinica_id", clinicaId);
  }

  const [resumoRes, fechadosRes, abertosRes, tratamentosRes] = await Promise.all([
    resumoQ,
    fechadosQ,
    abertosQ,
    tratamentosQ,
  ]);

  const empty: KpisAdminV2 = {
    faturamentoBruto: 0,
    totalRecebidoMes: 0,
    totalAReceberMes: 0,
    totalInadimplente: 0,
    valorLiquido: 0,
    valorBeautySmile: 0,
    totalImpostoNf: 0,
    totalTaxaCartao: 0,
    totalCustoMaoObra: 0,
    totalCustosProcedimentos: 0,
    totalComissoesMedicas: 0,
    orcamentosFechadosQtde: 0,
    orcamentosFechadosValor: 0,
    orcamentosAbertosQtde: 0,
    orcamentosAbertosValor: 0,
    procedimentosRealizados: 0,
    resumoCalculado: false,
  };

  if (resumoRes.error) {
    console.error("[fetchKpisAdminV2] Erro ao buscar resumo_mensal:", resumoRes.error.message);
    return empty;
  }
  if (fechadosRes.error) {
    console.error("[fetchKpisAdminV2] Erro ao buscar orcamentos_fechados:", fechadosRes.error.message);
    return empty;
  }
  if (abertosRes.error) {
    console.error("[fetchKpisAdminV2] Erro ao buscar orcamentos_abertos:", abertosRes.error.message);
    return empty;
  }
  if (tratamentosRes.error) {
    console.error("[fetchKpisAdminV2] Erro ao buscar tratamentos_executados:", tratamentosRes.error.message);
    return empty;
  }

  const resumo = resumoRes.data ?? [];
  const sum = (arr: Record<string, unknown>[], key: string) =>
    arr.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);

  const fechados = (fechadosRes.data ?? []) as { id: string; valor_total: number }[];
  const abertos = (abertosRes.data ?? []) as { id: string; valor_total: number }[];

  return {
    faturamentoBruto: sum(resumo as Record<string, unknown>[], "faturamento_bruto"),
    totalRecebidoMes: sum(resumo as Record<string, unknown>[], "total_recebido_mes"),
    totalAReceberMes: sum(resumo as Record<string, unknown>[], "total_a_receber_mes"),
    totalInadimplente: sum(resumo as Record<string, unknown>[], "total_inadimplente"),
    valorLiquido: sum(resumo as Record<string, unknown>[], "valor_liquido"),
    valorBeautySmile: sum(resumo as Record<string, unknown>[], "valor_beauty_smile"),
    totalImpostoNf: sum(resumo as Record<string, unknown>[], "total_imposto_nf"),
    totalTaxaCartao: sum(resumo as Record<string, unknown>[], "total_taxa_cartao"),
    totalCustoMaoObra: sum(resumo as Record<string, unknown>[], "total_custo_mao_obra"),
    totalCustosProcedimentos: sum(resumo as Record<string, unknown>[], "total_custos_procedimentos"),
    totalComissoesMedicas: sum(resumo as Record<string, unknown>[], "total_comissoes_medicas"),
    orcamentosFechadosQtde: fechados.length,
    orcamentosFechadosValor: fechados.reduce((a, r) => a + Number(r.valor_total ?? 0), 0),
    orcamentosAbertosQtde: abertos.length,
    orcamentosAbertosValor: abertos.reduce((a, r) => a + Number(r.valor_total ?? 0), 0),
    procedimentosRealizados: (tratamentosRes.data ?? []).length,
    resumoCalculado: resumo.length > 0,
  } satisfies KpisAdminV2;
}

/** Cálculo de repasse do mês (base caixa) */
export async function fetchRepasseAdmin(mesReferencia: string, clinicaId?: string): Promise<RepasseAdminData> {
  const supabase = await createSupabaseServerClient();

  let resumoQ = supabase
    .from("resumo_mensal")
    .select("total_recebido_mes, total_taxa_cartao, total_imposto_nf, total_custo_mao_obra, total_custos_procedimentos, total_comissoes_medicas");

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    resumoQ = resumoQ.gte("mes_referencia", start).lte("mes_referencia", end);
  }
  if (clinicaId) resumoQ = resumoQ.eq("clinica_id", clinicaId);

  const [resumoRes, configRes] = await Promise.all([
    resumoQ,
    supabase
      .from("configuracoes_financeiras")
      .select("percentual_beauty_smile")
      .is("vigencia_fim", null)
      .single(),
  ]);

  const emptyRepasse: RepasseAdminData = {
    totalRecebido: 0, taxaSobreRecebido: 0, impostosNf: 0, custoMaoObra: 0,
    custosProcedimentos: 0, comissoesMedicas: 0, disponivelParaSplit: 0,
    valorRepassar: 0, valorBeautySmileRetém: 0, percentualBeautySmile: 60,
  };

  if (resumoRes.error) {
    console.error("[fetchRepasseAdmin] Erro ao buscar resumo_mensal:", resumoRes.error.message);
    return emptyRepasse;
  }
  if (configRes.error) {
    console.error("[fetchRepasseAdmin] Erro ao buscar configuracoes_financeiras:", configRes.error.message);
    return emptyRepasse;
  }

  const resumo = (resumoRes.data ?? []) as Record<string, unknown>[];
  const sum = (key: string) => resumo.reduce((a, r) => a + Number(r[key] ?? 0), 0);

  const totalRecebido = sum("total_recebido_mes");
  const taxaSobreRecebido = sum("total_taxa_cartao");
  const impostosNf = sum("total_imposto_nf");
  const custoMaoObra = sum("total_custo_mao_obra");
  const custosProcedimentos = sum("total_custos_procedimentos");
  const comissoesMedicas = sum("total_comissoes_medicas");

  const percentualBS = Number(configRes.data?.percentual_beauty_smile ?? 60) / 100;

  const disponivel = totalRecebido - taxaSobreRecebido - impostosNf - custoMaoObra - custosProcedimentos - comissoesMedicas;
  const valorRepassar = disponivel * (1 - percentualBS);
  const valorBSRetek = disponivel * percentualBS;

  return {
    totalRecebido,
    taxaSobreRecebido,
    impostosNf,
    custoMaoObra,
    custosProcedimentos,
    comissoesMedicas,
    disponivelParaSplit: disponivel,
    valorRepassar,
    valorBeautySmileRetém: valorBSRetek,
    percentualBeautySmile: percentualBS * 100,
  };
}

/** Dados para DRE cascata (base faturamento bruto) */
export async function fetchDreAdmin(mesReferencia: string, clinicaId?: string): Promise<DreAdminData> {
  const supabase = await createSupabaseServerClient();

  let dreResumoQ = supabase
    .from("resumo_mensal")
    .select("faturamento_bruto, total_custos_procedimentos, total_taxa_cartao, total_imposto_nf, total_custo_mao_obra, total_comissoes_medicas, valor_liquido, valor_beauty_smile, valor_clinica");

  let comissoesDentistaQ = supabase
    .from("comissoes_dentista")
    .select("valor_comissao");

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    dreResumoQ = dreResumoQ.gte("mes_referencia", start).lte("mes_referencia", end);
    comissoesDentistaQ = comissoesDentistaQ.gte("mes_referencia", start).lte("mes_referencia", end);
  }
  if (clinicaId) {
    dreResumoQ = dreResumoQ.eq("clinica_id", clinicaId);
    comissoesDentistaQ = comissoesDentistaQ.eq("clinica_id", clinicaId);
  }

  const [resumoRes, configRes, comissoesDentistaRes] = await Promise.all([
    dreResumoQ,
    supabase
      .from("configuracoes_financeiras")
      .select("percentual_beauty_smile")
      .is("vigencia_fim", null)
      .single(),
    comissoesDentistaQ,
  ]);

  const emptyDre: DreAdminData = {
    faturamentoBruto: 0, custosProcedimentos: 0, taxaMaquininha: 0,
    impostosNf: 0, custoMaoObra: 0, comissoesMedicas: 0, valorLiquido: 0,
    valorBeautySmile: 0, valorClinica: 0, percentualBeautySmile: 60,
    comissaoDentista: 0, resultadoLiquidoBS: 0,
  };

  if (resumoRes.error) {
    console.error("[fetchDreAdmin] Erro ao buscar resumo_mensal:", resumoRes.error.message);
    return emptyDre;
  }
  if (configRes.error) {
    console.error("[fetchDreAdmin] Erro ao buscar configuracoes_financeiras:", configRes.error.message);
    return emptyDre;
  }
  if (comissoesDentistaRes.error) {
    console.error("[fetchDreAdmin] Erro ao buscar comissoes_dentista:", comissoesDentistaRes.error.message);
    return emptyDre;
  }

  const resumo = (resumoRes.data ?? []) as Record<string, unknown>[];
  const sum = (key: string) => resumo.reduce((a, r) => a + Number(r[key] ?? 0), 0);

  const comissaoDentista = ((comissoesDentistaRes.data ?? []) as Record<string, unknown>[]).reduce(
    (a, r) => a + Number(r.valor_comissao ?? 0),
    0
  );
  const valorBeautySmile = sum("valor_beauty_smile");

  return {
    faturamentoBruto: sum("faturamento_bruto"),
    custosProcedimentos: sum("total_custos_procedimentos"),
    taxaMaquininha: sum("total_taxa_cartao"),
    impostosNf: sum("total_imposto_nf"),
    custoMaoObra: sum("total_custo_mao_obra"),
    comissoesMedicas: sum("total_comissoes_medicas"),
    valorLiquido: sum("valor_liquido"),
    valorBeautySmile,
    valorClinica: sum("valor_clinica"),
    percentualBeautySmile: Number(configRes.data?.percentual_beauty_smile ?? 60),
    comissaoDentista,
    resultadoLiquidoBS: valorBeautySmile - comissaoDentista,
  };
}

/** Lista de orçamentos fechados do mês para tabela */
export async function fetchOrcamentosFechados(mesReferencia: string, clinicaId?: string): Promise<OrcamentoFechadoItem[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("orcamentos_fechados")
    .select("id, paciente_nome, valor_total, valor_pago, valor_em_aberto, status, data_fechamento, clinicas_parceiras(nome)")
    .order("valor_total", { ascending: false })
    .limit(200);

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    query = query.gte("mes_referencia", start).lte("mes_referencia", end);
  }
  if (clinicaId) query = query.eq("clinica_id", clinicaId);

  const { data, error } = await query;
  if (error) return [];

  type Row = {
    id: string;
    paciente_nome: string;
    valor_total: number;
    valor_pago: number;
    valor_em_aberto: number;
    status: string;
    data_fechamento: string | null;
    clinicas_parceiras: { nome: string } | { nome: string }[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => {
    const cp = r.clinicas_parceiras;
    const clinica = Array.isArray(cp) ? cp[0] : cp;
    return {
      id: r.id,
      pacienteNome: r.paciente_nome,
      clinicaNome: clinica?.nome ?? "—",
      valorTotal: Number(r.valor_total ?? 0),
      valorPago: Number(r.valor_pago ?? 0),
      valorEmAberto: Number(r.valor_em_aberto ?? 0),
      status: r.status,
      dataFechamento: r.data_fechamento,
    };
  });
}

/** Lista de orçamentos abertos do mês para tabela */
export async function fetchOrcamentosAbertos(mesReferencia: string, clinicaId?: string): Promise<OrcamentoAbertoItem[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("orcamentos_abertos")
    .select("id, paciente_nome, valor_total, data_criacao, clinicas_parceiras(nome)")
    .order("valor_total", { ascending: false })
    .limit(200);

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    query = query.gte("mes_referencia", start).lte("mes_referencia", end);
  }
  if (clinicaId) query = query.eq("clinica_id", clinicaId);

  const { data, error } = await query;
  if (error) return [];

  type Row = {
    id: string;
    paciente_nome: string;
    valor_total: number;
    data_criacao: string | null;
    clinicas_parceiras: { nome: string } | { nome: string }[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => {
    const cp = r.clinicas_parceiras;
    const clinica = Array.isArray(cp) ? cp[0] : cp;
    return {
      id: r.id,
      pacienteNome: r.paciente_nome,
      clinicaNome: clinica?.nome ?? "—",
      valorTotal: Number(r.valor_total ?? 0),
      dataCriacao: r.data_criacao,
    };
  });
}

/** Evolução de vendas dos últimos N meses (para gráfico de barras) */
export async function fetchVendasEvolucao(mesReferencia: string, meses: number = 3, clinicaId?: string): Promise<ChartVendasPoint[]> {
  const supabase = await createSupabaseServerClient();
  const [y, m] = mesReferencia.split("-").map(Number);
  const points: ChartVendasPoint[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    points.push({ mesReferencia: `${yy}-${mm}`, fechadosQtde: 0, fechadosValor: 0, abertosQtde: 0, abertosValor: 0 });
  }

  const start = points[0]!.mesReferencia + "-01";
  const endLast = points[points.length - 1]!.mesReferencia;
  const [ey, em2] = endLast.split("-").map(Number);
  const end = `${endLast}-${String(new Date(ey, em2, 0).getDate()).padStart(2, "0")}`;

  let fechadosQ = supabase
    .from("orcamentos_fechados")
    .select("mes_referencia, valor_total")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);
  let abertosQ = supabase
    .from("orcamentos_abertos")
    .select("mes_referencia, valor_total")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);
  if (clinicaId) {
    fechadosQ = fechadosQ.eq("clinica_id", clinicaId);
    abertosQ = abertosQ.eq("clinica_id", clinicaId);
  }

  const [fechadosRes, abertosRes] = await Promise.all([fechadosQ, abertosQ]);

  if (fechadosRes.error) {
    console.error("[fetchVendasEvolucao] Erro ao buscar orcamentos_fechados:", fechadosRes.error.message);
  }
  if (abertosRes.error) {
    console.error("[fetchVendasEvolucao] Erro ao buscar orcamentos_abertos:", abertosRes.error.message);
  }

  const byMes: Record<string, { fechadosQtde: number; fechadosValor: number; abertosQtde: number; abertosValor: number }> = {};
  points.forEach((p) => {
    byMes[p.mesReferencia] = { fechadosQtde: 0, fechadosValor: 0, abertosQtde: 0, abertosValor: 0 };
  });

  (fechadosRes.data ?? []).forEach((r: Record<string, unknown>) => {
    const mes = (r.mes_referencia as string).slice(0, 7);
    if (byMes[mes]) {
      byMes[mes]!.fechadosQtde++;
      byMes[mes]!.fechadosValor += Number(r.valor_total ?? 0);
    }
  });
  (abertosRes.data ?? []).forEach((r: Record<string, unknown>) => {
    const mes = (r.mes_referencia as string).slice(0, 7);
    if (byMes[mes]) {
      byMes[mes]!.abertosQtde++;
      byMes[mes]!.abertosValor += Number(r.valor_total ?? 0);
    }
  });

  points.forEach((p) => {
    const v = byMes[p.mesReferencia];
    if (v) Object.assign(p, v);
  });
  return points;
}

/** Ranking de procedimentos realizados no mês */
export async function fetchProcedimentosRanking(mesReferencia: string, clinicaId?: string): Promise<ProcedimentoRankingItem[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("tratamentos_executados")
    .select("procedimento_nome, quantidade, procedimento_id, procedimentos(nome, custo_fixo, categoria)")
    .not("procedimento_id", "is", null);

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    query = query.gte("mes_referencia", start).lte("mes_referencia", end);
  }
  if (clinicaId) query = query.eq("clinica_id", clinicaId);

  const { data, error } = await query;
  if (error) return [];

  type Row = {
    procedimento_nome: string | null;
    quantidade: number;
    procedimento_id: string | null;
    procedimentos: { nome: string; custo_fixo: number; categoria: string | null } | { nome: string; custo_fixo: number; categoria: string | null }[] | null;
  };

  const grouped: Record<string, { qtde: number; custoUnitario: number; categoria: string }> = {};
  ((data ?? []) as unknown as Row[]).forEach((r) => {
    const cp = r.procedimentos;
    const proc = Array.isArray(cp) ? cp[0] : cp;
    const nome = proc?.nome ?? r.procedimento_nome ?? "Sem nome";
    const custo = Number(proc?.custo_fixo ?? 0);
    const categoria = proc?.categoria ?? "Sem categoria";
    if (!grouped[nome]) grouped[nome] = { qtde: 0, custoUnitario: custo, categoria };
    grouped[nome]!.qtde += Number(r.quantidade ?? 1);
  });

  const totalQtde = Object.values(grouped).reduce((a, v) => a + v.qtde, 0);
  return Object.entries(grouped)
    .map(([nome, v]) => ({
      procedimentoNome: nome,
      categoria: v.categoria,
      quantidade: v.qtde,
      custoUnitario: v.custoUnitario,
      custoTotal: v.qtde * v.custoUnitario,
      percentualQtde: totalQtde > 0 ? (v.qtde / totalQtde) * 100 : 0,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

export async function fetchTratamentosVendidos(mesReferencia: string, clinicaId?: string): Promise<TratamentoVendidoItem[]> {
  const supabase = await createSupabaseServerClient();

  // Tentar buscar de itens_orcamento (dados desmembrados)
  const itensResult = await fetchTratamentosVendidosFromItens(supabase, mesReferencia, clinicaId);
  if (itensResult.length > 0) return itensResult;

  // Fallback: logica antiga agrupando por procedimentos_texto
  let query = supabase
    .from("orcamentos_fechados")
    .select("procedimentos_texto, valor_total");

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    query = query.gte("mes_referencia", start).lte("mes_referencia", end);
  }
  if (clinicaId) query = query.eq("clinica_id", clinicaId);

  const { data, error } = await query;
  if (error) return [];

  type Row = { procedimentos_texto: string | null; valor_total: number };

  const grouped: Record<string, { qtde: number; valorTotal: number }> = {};
  ((data ?? []) as Row[]).forEach((r) => {
    const nome = r.procedimentos_texto?.trim() || "Não especificado";
    if (!grouped[nome]) grouped[nome] = { qtde: 0, valorTotal: 0 };
    grouped[nome]!.qtde += 1;
    grouped[nome]!.valorTotal += Number(r.valor_total ?? 0);
  });

  const totalValor = Object.values(grouped).reduce((a, v) => a + v.valorTotal, 0);

  return Object.entries(grouped)
    .map(([nome, v]) => ({
      tratamentoNome: nome,
      categoria: null,
      quantidade: v.qtde,
      valorTotal: v.valorTotal,
      percentualFaturamento: totalValor > 0 ? (v.valorTotal / totalValor) * 100 : 0,
    }))
    .sort((a, b) => b.valorTotal - a.valorTotal);
}

async function fetchTratamentosVendidosFromItens(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  mesReferencia: string,
  clinicaId?: string
): Promise<TratamentoVendidoItem[]> {
  // Buscar itens_orcamento via join com orcamentos_fechados
  let query = supabase
    .from("itens_orcamento")
    .select("procedimento_nome_original, valor_proporcional, categoria, orcamento_fechado_id, clinica_id");

  if (clinicaId) query = query.eq("clinica_id", clinicaId);

  const { data: allItens, error } = await query;
  if (error || !allItens?.length) return [];

  // Filtrar por mes via orcamentos_fechados
  let orcQuery = supabase
    .from("orcamentos_fechados")
    .select("id")
    .not("split_status", "is", null);

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    orcQuery = orcQuery.gte("mes_referencia", start).lte("mes_referencia", end);
  }
  if (clinicaId) orcQuery = orcQuery.eq("clinica_id", clinicaId);

  const { data: orcs, error: errOrcs } = await orcQuery;
  if (errOrcs) {
    console.error("[fetchTratamentosVendidosFromItens] Erro ao buscar orcamentos_fechados:", errOrcs.message);
    return [];
  }
  if (!orcs?.length) return [];

  const orcIds = new Set(orcs.map((o) => o.id));

  type ItemRow = {
    procedimento_nome_original: string;
    valor_proporcional: number;
    categoria: string | null;
    orcamento_fechado_id: string;
  };

  const filtered = (allItens as ItemRow[]).filter((it) =>
    orcIds.has(it.orcamento_fechado_id)
  );

  if (filtered.length === 0) return [];

  const grouped: Record<string, { qtde: number; valorTotal: number; categoria: string | null }> = {};
  for (const it of filtered) {
    const nome = it.procedimento_nome_original.trim() || "Nao especificado";
    if (!grouped[nome]) grouped[nome] = { qtde: 0, valorTotal: 0, categoria: it.categoria };
    grouped[nome]!.qtde += 1;
    grouped[nome]!.valorTotal += Number(it.valor_proporcional ?? 0);
  }

  const totalValor = Object.values(grouped).reduce((a, v) => a + v.valorTotal, 0);

  return Object.entries(grouped)
    .map(([nome, v]) => ({
      tratamentoNome: nome,
      categoria: v.categoria,
      quantidade: v.qtde,
      valorTotal: v.valorTotal,
      percentualFaturamento: totalValor > 0 ? (v.valorTotal / totalValor) * 100 : 0,
    }))
    .sort((a, b) => b.valorTotal - a.valorTotal);
}

const MONTHS_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export async function fetchTratamentosEvolucao(mesAtual: string, n: number = 6, clinicaId?: string): Promise<TratamentosEvolucaoData> {
  const supabase = await createSupabaseServerClient();

  // Build last N months ending at mesAtual
  const meses: string[] = [];
  const [yy, mm] = mesAtual.split("-").map(Number);
  for (let i = n - 1; i >= 0; i--) {
    let mo = mm - i;
    let yr = yy;
    while (mo <= 0) { mo += 12; yr -= 1; }
    meses.push(`${yr}-${String(mo).padStart(2, "0")}`);
  }

  const start = firstDayOfMonth(meses[0]!);
  const end = lastDayOfMonth(meses[meses.length - 1]!);

  // Tentar buscar de itens_orcamento primeiro
  const itensResult = await fetchEvolucaoFromItens(supabase, meses, start, end, clinicaId);
  if (itensResult) return itensResult;

  // Fallback: logica antiga
  let query = supabase
    .from("orcamentos_fechados")
    .select("procedimentos_texto, valor_total, mes_referencia")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);

  if (clinicaId) query = query.eq("clinica_id", clinicaId);

  const { data, error } = await query;
  if (error) return { meses: [], top5: [], series: [] };

  type Row = { procedimentos_texto: string | null; valor_total: number; mes_referencia: string };

  const totals: Record<string, number> = {};
  ((data ?? []) as Row[]).forEach((r) => {
    const nome = r.procedimentos_texto?.trim() || "Não especificado";
    totals[nome] = (totals[nome] ?? 0) + Number(r.valor_total ?? 0);
  });
  const top5 = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome]) => nome);

  const byMes: Record<string, Record<string, { valor: number; qtde: number }>> = {};
  meses.forEach((m) => { byMes[m] = {}; });

  ((data ?? []) as Row[]).forEach((r) => {
    const nome = r.procedimentos_texto?.trim() || "Não especificado";
    if (!top5.includes(nome)) return;
    const m = r.mes_referencia.slice(0, 7);
    if (!byMes[m]) return;
    if (!byMes[m]![nome]) byMes[m]![nome] = { valor: 0, qtde: 0 };
    byMes[m]![nome]!.valor += Number(r.valor_total ?? 0);
    byMes[m]![nome]!.qtde += 1;
  });

  const mesLabels = meses.map((m) => {
    const [y, mo] = m.split("-");
    return `${MONTHS_LABEL[Number(mo) - 1]}/${y!.slice(2)}`;
  });

  const series = meses.map((m, i) => ({
    mes: mesLabels[i]!,
    valores: byMes[m] ?? {},
  }));

  return { meses: mesLabels, top5, series };
}

async function fetchEvolucaoFromItens(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  meses: string[],
  start: string,
  end: string,
  clinicaId?: string
): Promise<TratamentosEvolucaoData | null> {
  // Buscar orcamentos splitados no periodo
  let orcQuery = supabase
    .from("orcamentos_fechados")
    .select("id, mes_referencia")
    .not("split_status", "is", null)
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);

  if (clinicaId) orcQuery = orcQuery.eq("clinica_id", clinicaId);

  const { data: orcs, error: errOrcs } = await orcQuery;
  if (errOrcs) {
    console.error("[fetchEvolucaoFromItens] Erro ao buscar orcamentos_fechados:", errOrcs.message);
    return null;
  }
  if (!orcs?.length) return null;

  const orcIds = orcs.map((o) => o.id);
  const orcMesMap = new Map(orcs.map((o) => [o.id, (o.mes_referencia as string).slice(0, 7)]));

  const itensQuery = supabase
    .from("itens_orcamento")
    .select("procedimento_nome_original, valor_proporcional, orcamento_fechado_id")
    .in("orcamento_fechado_id", orcIds);

  const { data: itensData, error: errItens } = await itensQuery;
  if (errItens) {
    console.error("[fetchEvolucaoFromItens] Erro ao buscar itens_orcamento:", errItens.message);
    return null;
  }
  if (!itensData?.length) return null;

  type ItemRow = {
    procedimento_nome_original: string;
    valor_proporcional: number;
    orcamento_fechado_id: string;
  };

  // Ranking total
  const totals: Record<string, number> = {};
  for (const it of itensData as ItemRow[]) {
    const nome = it.procedimento_nome_original.trim() || "Nao especificado";
    totals[nome] = (totals[nome] ?? 0) + Number(it.valor_proporcional ?? 0);
  }
  const top5 = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome]) => nome);

  // Build series
  const byMes: Record<string, Record<string, { valor: number; qtde: number }>> = {};
  meses.forEach((m) => { byMes[m] = {}; });

  for (const it of itensData as ItemRow[]) {
    const nome = it.procedimento_nome_original.trim() || "Nao especificado";
    if (!top5.includes(nome)) continue;
    const m = orcMesMap.get(it.orcamento_fechado_id);
    if (!m || !byMes[m]) continue;
    if (!byMes[m]![nome]) byMes[m]![nome] = { valor: 0, qtde: 0 };
    byMes[m]![nome]!.valor += Number(it.valor_proporcional ?? 0);
    byMes[m]![nome]!.qtde += 1;
  }

  const mesLabels = meses.map((m) => {
    const [y, mo] = m.split("-");
    return `${MONTHS_LABEL[Number(mo) - 1]}/${y!.slice(2)}`;
  });

  const series = meses.map((m, i) => ({
    mes: mesLabels[i]!,
    valores: byMes[m] ?? {},
  }));

  return { meses: mesLabels, top5, series };
}

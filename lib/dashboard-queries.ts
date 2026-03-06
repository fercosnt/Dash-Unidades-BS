"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { KpisAdmin, RankingClinica, UploadStatusItem, KpisParceiro, ChartParceiroPoint, ChartDataAdminPoint, ChartLiquidoAdminPoint } from "@/types/dashboard.types";

function firstDayOfMonth(mesReferencia: string): string {
  return `${mesReferencia}-01`;
}

function lastDayOfMonth(mesReferencia: string): string {
  const [y, m] = mesReferencia.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${mesReferencia}-${String(last).padStart(2, "0")}`;
}

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

export async function fetchRankingClinicas(mesReferencia: string): Promise<RankingClinica[]> {
  const supabase = await createSupabaseServerClient();

  if (mesReferencia === "all") {
    return fetchRankingClinicasResumoGeral(supabase);
  }

  const start = firstDayOfMonth(mesReferencia);
  const end = lastDayOfMonth(mesReferencia);
  const { data, error } = await supabase
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

export async function fetchStatusUploads(mesReferencia: string): Promise<UploadStatusItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data: clinicas } = await supabase
    .from("clinicas_parceiras")
    .select("id, nome")
    .order("nome");

  let query = supabase
    .from("upload_batches")
    .select("clinica_id, tipo")
    .eq("status", "concluido");

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    query = query.gte("mes_referencia", start).lte("mes_referencia", end);
  }

  const { data: batches } = await query;

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
  mesesAtras: number = 12
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

  const { data, error } = await supabase
    .from("resumo_mensal")
    .select("mes_referencia, faturamento_bruto, total_recebido_mes")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);

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
  mesesAtras: number = 12
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

  const { data, error } = await supabase
    .from("resumo_mensal")
    .select("mes_referencia, valor_liquido")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);

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

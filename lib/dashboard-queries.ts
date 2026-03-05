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
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("resumo_mensal")
    .select("faturamento_bruto, total_recebido_mes, total_a_receber_mes, total_inadimplente, valor_liquido, valor_beauty_smile");

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    query = query.gte("mes_referencia", start).lte("mes_referencia", end);
  }

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

export async function fetchRankingClinicas(mesReferencia: string): Promise<RankingClinica[]> {
  const supabase = createSupabaseServerClient();
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
    .order("faturamento_bruto", { ascending: false });

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    query = query.gte("mes_referencia", start).lte("mes_referencia", end);
  }

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

export async function fetchStatusUploads(mesReferencia: string): Promise<UploadStatusItem[]> {
  const supabase = createSupabaseServerClient();
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
  const supabase = createSupabaseServerClient();
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
  const supabase = createSupabaseServerClient();
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
  const supabase = createSupabaseServerClient();
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
  const supabase = createSupabaseServerClient();
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

"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
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
} from "@/types/dashboard.types";

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

export async function fetchRankingClinicas(mesReferencia: string, clinicaId?: string): Promise<RankingClinica[]> {
  const supabase = await createSupabaseServerClient();
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

export async function fetchStatusUploads(mesReferencia: string, clinicaId?: string): Promise<UploadStatusItem[]> {
  const supabase = await createSupabaseServerClient();
  let clinicasQuery = supabase
    .from("clinicas_parceiras")
    .select("id, nome")
    .order("nome");
  if (clinicaId) clinicasQuery = clinicasQuery.eq("id", clinicaId);
  const { data: clinicas } = await clinicasQuery;

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

  const empty: RepasseAdminData = {
    totalRecebido: 0,
    taxaSobreRecebido: 0,
    impostosNf: 0,
    custoMaoObra: 0,
    custosProcedimentos: 0,
    comissoesMedicas: 0,
    disponivelParaSplit: 0,
    valorRepassar: 0,
    valorBeautySmileRetém: 0,
    percentualBeautySmile: 60,
  };

  if (mesReferencia === "all") return empty;

  const start = firstDayOfMonth(mesReferencia);
  const end = lastDayOfMonth(mesReferencia);

  let resumoQ = supabase
    .from("resumo_mensal")
    .select("total_recebido_mes, total_imposto_nf, total_custo_mao_obra, total_custos_procedimentos, total_comissoes_medicas")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);
  if (clinicaId) resumoQ = resumoQ.eq("clinica_id", clinicaId);

  const [resumoRes, parcelasRes, configRes] = await Promise.all([
    resumoQ,
    supabase
      .from("parcelas_cartao")
      .select("valor_parcela")
      .eq("status", "recebido")
      .gte("mes_recebimento", start)
      .lte("mes_recebimento", end),
    supabase
      .from("configuracoes_financeiras")
      .select("taxa_cartao_percentual, percentual_beauty_smile")
      .is("vigencia_fim", null)
      .single(),
  ]);

  const resumo = (resumoRes.data ?? []) as Record<string, unknown>[];
  const sum = (key: string) => resumo.reduce((a, r) => a + Number(r[key] ?? 0), 0);

  const totalRecebido = sum("total_recebido_mes");
  const impostosNf = sum("total_imposto_nf");
  const custoMaoObra = sum("total_custo_mao_obra");
  const custosProcedimentos = sum("total_custos_procedimentos");
  const comissoesMedicas = sum("total_comissoes_medicas");

  const parcelas = (parcelasRes.data ?? []) as { valor_parcela: number }[];
  const totalRecebidoCartao = parcelas.reduce((a, r) => a + Number(r.valor_parcela ?? 0), 0);

  const taxaCartaoPct = Number(configRes.data?.taxa_cartao_percentual ?? 0) / 100;
  const percentualBS = Number(configRes.data?.percentual_beauty_smile ?? 60) / 100;

  const taxaSobreRecebido = totalRecebidoCartao * taxaCartaoPct;
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

  const empty: DreAdminData = {
    faturamentoBruto: 0,
    custosProcedimentos: 0,
    taxaMaquininha: 0,
    impostosNf: 0,
    custoMaoObra: 0,
    comissoesMedicas: 0,
    valorLiquido: 0,
    valorBeautySmile: 0,
    valorClinica: 0,
    percentualBeautySmile: 60,
    comissaoDentista: 0,
    resultadoLiquidoBS: 0,
  };

  if (mesReferencia === "all") return empty;

  const start = firstDayOfMonth(mesReferencia);
  const end = lastDayOfMonth(mesReferencia);

  let dreResumoQ = supabase
    .from("resumo_mensal")
    .select("faturamento_bruto, total_custos_procedimentos, total_taxa_cartao, total_imposto_nf, total_custo_mao_obra, total_comissoes_medicas, valor_liquido, valor_beauty_smile, valor_clinica")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);
  if (clinicaId) dreResumoQ = dreResumoQ.eq("clinica_id", clinicaId);

  let comissoesDentistaQ = supabase
    .from("comissoes_dentista")
    .select("valor_comissao")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);
  if (clinicaId) comissoesDentistaQ = comissoesDentistaQ.eq("clinica_id", clinicaId);

  const [resumoRes, configRes, comissoesDentistaRes] = await Promise.all([
    dreResumoQ,
    supabase
      .from("configuracoes_financeiras")
      .select("percentual_beauty_smile")
      .is("vigencia_fim", null)
      .single(),
    comissoesDentistaQ,
  ]);

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
    .select("procedimento_nome, quantidade, procedimento_id, procedimentos(custo_fixo)");

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
    procedimentos: { custo_fixo: number } | { custo_fixo: number }[] | null;
  };

  const grouped: Record<string, { qtde: number; custoUnitario: number }> = {};
  ((data ?? []) as unknown as Row[]).forEach((r) => {
    const nome = r.procedimento_nome ?? "Sem nome";
    const cp = r.procedimentos;
    const custo = Number((Array.isArray(cp) ? cp[0] : cp)?.custo_fixo ?? 0);
    if (!grouped[nome]) grouped[nome] = { qtde: 0, custoUnitario: custo };
    grouped[nome]!.qtde += Number(r.quantidade ?? 1);
  });

  const totalQtde = Object.values(grouped).reduce((a, v) => a + v.qtde, 0);
  return Object.entries(grouped)
    .map(([nome, v]) => ({
      procedimentoNome: nome,
      quantidade: v.qtde,
      custoUnitario: v.custoUnitario,
      custoTotal: v.qtde * v.custoUnitario,
      percentualQtde: totalQtde > 0 ? (v.qtde / totalQtde) * 100 : 0,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

export async function fetchTratamentosVendidos(mesReferencia: string, clinicaId?: string): Promise<TratamentoVendidoItem[]> {
  const supabase = await createSupabaseServerClient();

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
      quantidade: v.qtde,
      valorTotal: v.valorTotal,
      percentualFaturamento: totalValor > 0 ? (v.valorTotal / totalValor) * 100 : 0,
    }))
    .sort((a, b) => b.valorTotal - a.valorTotal);
}

"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/utils/date-helpers";
import type { DreBsUnidadeData, DreRecebiveisData } from "@/types/dashboard.types";
import { getConfigVigente } from "@/app/admin/configuracoes/financeiro/actions";

/* ------------------------------------------------------------------ */
/*  Categorias                                                         */
/* ------------------------------------------------------------------ */

export async function fetchCategoriasAtivas() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categorias_despesa")
    .select("id, nome, ativo")
    .eq("ativo", true)
    .order("nome");
  if (error) {
    console.error("[fetchCategoriasAtivas]", error.message);
    return [];
  }
  return data ?? [];
}

export async function fetchTodasCategorias() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categorias_despesa")
    .select("id, nome, ativo, created_at")
    .order("nome");
  if (error) {
    console.error("[fetchTodasCategorias]", error.message);
    return [];
  }
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/*  Despesas — listagem                                                */
/* ------------------------------------------------------------------ */

export type DespesaItem = {
  id: string;
  clinicaId: string;
  clinicaNome: string;
  mesReferencia: string;
  categoriaId: string;
  categoriaNome: string;
  descricao: string | null;
  valor: number;
  recorrente: boolean;
};

export async function fetchDespesasPorMes(
  mesReferencia: string,
  clinicaId?: string,
): Promise<DespesaItem[]> {
  const supabase = await createSupabaseServerClient();

  let q = supabase
    .from("despesas_operacionais")
    .select("id, clinica_id, mes_referencia, categoria_id, descricao, valor, recorrente, clinicas_parceiras(nome), categorias_despesa(nome)")
    .order("created_at", { ascending: false });

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    q = q.gte("mes_referencia", start).lte("mes_referencia", end);
  }
  if (clinicaId) q = q.eq("clinica_id", clinicaId);

  const { data, error } = await q;
  if (error) {
    console.error("[fetchDespesasPorMes]", error.message);
    return [];
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    clinicaId: String(r.clinica_id),
    clinicaNome: String((r.clinicas_parceiras as Record<string, unknown>)?.nome ?? ""),
    mesReferencia: String(r.mes_referencia),
    categoriaId: String(r.categoria_id),
    categoriaNome: String((r.categorias_despesa as Record<string, unknown>)?.nome ?? ""),
    descricao: r.descricao as string | null,
    valor: Number(r.valor),
    recorrente: Boolean(r.recorrente),
  }));
}

/* ------------------------------------------------------------------ */
/*  Despesas — totais por categoria                                    */
/* ------------------------------------------------------------------ */

export async function fetchDespesasPorCategoria(
  mesReferencia: string,
  clinicaId?: string,
): Promise<{ categoriaId: string; categoria: string; total: number }[]> {
  const despesas = await fetchDespesasPorMes(mesReferencia, clinicaId);
  const map = new Map<string, { categoriaId: string; categoria: string; total: number }>();

  for (const d of despesas) {
    const existing = map.get(d.categoriaId);
    if (existing) {
      existing.total += d.valor;
    } else {
      map.set(d.categoriaId, { categoriaId: d.categoriaId, categoria: d.categoriaNome, total: d.valor });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export async function fetchTotalDespesasMes(
  mesReferencia: string,
  clinicaId?: string,
): Promise<number> {
  const porCategoria = await fetchDespesasPorCategoria(mesReferencia, clinicaId);
  return porCategoria.reduce((s, c) => s + c.total, 0);
}

/* ------------------------------------------------------------------ */
/*  Taxas reais de cartão                                              */
/* ------------------------------------------------------------------ */

type TaxaCartaoReal = {
  id: string;
  modalidade: string;
  bandeira: string;
  numeroParcelas: number | null;
  taxaPercentual: number;
};

export async function fetchTaxasCartaoVigentes(): Promise<TaxaCartaoReal[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("taxas_cartao_reais")
    .select("id, modalidade, bandeira, numero_parcelas, taxa_percentual")
    .is("vigencia_fim", null)
    .order("bandeira")
    .order("modalidade")
    .order("numero_parcelas");
  if (error) {
    console.error("[fetchTaxasCartaoVigentes]", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: String(r.id),
    modalidade: String(r.modalidade),
    bandeira: String(r.bandeira),
    numeroParcelas: r.numero_parcelas,
    taxaPercentual: Number(r.taxa_percentual),
  }));
}

/**
 * Calcula a taxa real de cartão a partir dos pagamentos recebidos no mês/clínica.
 * Usa a bandeira do pagamento para determinar a taxa correta.
 * Se bandeira não definida, usa 'visa_master' como padrão.
 */
export async function calcularTaxaRealCartao(
  mesReferencia: string,
  clinicaId?: string,
): Promise<number> {
  if (mesReferencia === "all") return 0;

  const supabase = await createSupabaseServerClient();
  const start = firstDayOfMonth(mesReferencia);
  const end = lastDayOfMonth(mesReferencia);

  // Buscar pagamentos do mês (só cartão crédito e débito)
  let pagQ = supabase
    .from("pagamentos")
    .select("valor, forma, parcelas, bandeira")
    .gte("data_pagamento", start)
    .lte("data_pagamento", end)
    .in("forma", ["cartao_credito", "cartao_debito"]);

  if (clinicaId) pagQ = pagQ.eq("clinica_id", clinicaId);

  const [pagRes, taxasRes] = await Promise.all([
    pagQ,
    fetchTaxasCartaoVigentes(),
  ]);

  if (pagRes.error) {
    console.error("[calcularTaxaRealCartao] Erro pagamentos:", pagRes.error.message);
    return 0;
  }

  // Lookup: "visa_master_credito_3" → 2.19, "outros_debito_null" → 1.49
  const taxaMap = new Map<string, number>();
  for (const t of taxasRes) {
    const key = `${t.bandeira}_${t.modalidade}_${t.numeroParcelas}`;
    taxaMap.set(key, t.taxaPercentual);
  }

  let totalTaxa = 0;
  for (const pag of pagRes.data ?? []) {
    const p = pag as Record<string, unknown>;
    const forma = String(p.forma);
    const valor = Number(p.valor);
    const parcelas = Number(p.parcelas ?? 1);
    const bandeira = String(p.bandeira ?? "visa_master");

    let key: string;
    if (forma === "cartao_credito") {
      key = `${bandeira}_credito_${parcelas}`;
    } else {
      key = `${bandeira}_debito_null`;
    }

    const taxa = taxaMap.get(key) ?? 0;
    totalTaxa += Math.round((valor * taxa / 100) * 100) / 100;
  }

  return Math.round(totalTaxa * 100) / 100;
}

/* ------------------------------------------------------------------ */
/*  DRE Recebíveis — visão caixa (o que entrou na conta)               */
/* ------------------------------------------------------------------ */

/**
 * Calcula o DRE de recebíveis: quanto dinheiro efetivamente entrou na conta no mês.
 * - Pix e dinheiro: contados diretamente pelo pagamento no mês
 * - Cartão débito e crédito à vista (1x): contados diretamente
 * - Cartão crédito parcelado (>1x): contado via parcelas_cartao com status='recebido'
 * - Taxa real: calculada sobre transações de cartão do mês
 */
export async function calcularDreRecebiveis(
  mesReferencia: string,
  clinicaId?: string,
): Promise<DreRecebiveisData> {
  const empty: DreRecebiveisData = {
    recebidoPix: 0, recebidoDinheiro: 0, recebidoDebitoAvista: 0,
    recebidoParcelasCartao: 0, totalRecebido: 0,
    custosProcedimentos: 0, custoMaoObra: 0, taxaCartaoCobrada: 0,
    impostoNfCobrado: 0, comissoesMedicas: 0, valorBeautySmile60: 0,
    receitaBsBruta: 0, taxaRealCartao: 0, receitaPosTaxas: 0,
    comissaoDentista: 0, despesasPorCategoria: [], totalDespesas: 0,
    resultadoUnidade: 0,
  };

  if (mesReferencia === "all") return empty;

  const supabase = await createSupabaseServerClient();
  const start = firstDayOfMonth(mesReferencia);
  const end = lastDayOfMonth(mesReferencia);

  // 1. Pagamentos diretos do mês (pix, dinheiro, débito, crédito à vista)
  let pagQ = supabase
    .from("pagamentos")
    .select("valor, forma, parcelas")
    .gte("data_pagamento", start)
    .lte("data_pagamento", end);
  if (clinicaId) pagQ = pagQ.eq("clinica_id", clinicaId);

  // 2. Parcelas de cartão recebidas no mês
  let parcQ = supabase
    .from("parcelas_cartao")
    .select("valor_parcela")
    .eq("status", "recebido")
    .gte("mes_recebimento", start)
    .lte("mes_recebimento", end);
  if (clinicaId) parcQ = parcQ.eq("clinica_id", clinicaId);

  // 3. Resumo mensal (custos do split)
  let resumoQ = supabase
    .from("resumo_mensal")
    .select("total_custos_procedimentos, total_custo_mao_obra, total_taxa_cartao, total_imposto_nf, total_comissoes_medicas");
  resumoQ = resumoQ.gte("mes_referencia", start).lte("mes_referencia", end);
  if (clinicaId) resumoQ = resumoQ.eq("clinica_id", clinicaId);

  // 4. Comissões dentista
  let comDentistaQ = supabase
    .from("comissoes_dentista")
    .select("valor_comissao")
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);
  if (clinicaId) comDentistaQ = comDentistaQ.eq("clinica_id", clinicaId);

  const [pagRes, parcRes, taxaReal, resumoRes, configRes, comDentistaRes, despesasPorCategoria] = await Promise.all([
    pagQ,
    parcQ,
    calcularTaxaRealCartao(mesReferencia, clinicaId),
    resumoQ,
    getConfigVigente(),
    comDentistaQ,
    fetchDespesasPorCategoria(mesReferencia, clinicaId),
  ]);

  if (pagRes.error) {
    console.error("[calcularDreRecebiveis] Erro pagamentos:", pagRes.error.message);
    return empty;
  }
  if (parcRes.error) {
    console.error("[calcularDreRecebiveis] Erro parcelas:", parcRes.error.message);
    return empty;
  }
  if (resumoRes.error) {
    console.error("[calcularDreRecebiveis] Erro resumo:", resumoRes.error.message);
    return empty;
  }
  if (comDentistaRes.error) {
    console.error("[calcularDreRecebiveis] Erro comissoes_dentista:", comDentistaRes.error.message);
    return empty;
  }

  // --- Entradas (caixa) ---
  let recebidoPix = 0;
  let recebidoDinheiro = 0;
  let recebidoDebitoAvista = 0;

  for (const pag of pagRes.data ?? []) {
    const p = pag as Record<string, unknown>;
    const valor = Number(p.valor);
    const forma = String(p.forma);
    const parcelas = Number(p.parcelas ?? 1);

    if (forma === "pix") {
      recebidoPix += valor;
    } else if (forma === "dinheiro") {
      recebidoDinheiro += valor;
    } else if (forma === "cartao_debito") {
      recebidoDebitoAvista += valor;
    } else if (forma === "cartao_credito" && parcelas <= 1) {
      recebidoDebitoAvista += valor;
    }
  }

  const recebidoParcelasCartao = (parcRes.data ?? []).reduce(
    (s, r) => s + Number((r as Record<string, unknown>).valor_parcela ?? 0), 0
  );

  const totalRecebido = Math.round(
    (recebidoPix + recebidoDinheiro + recebidoDebitoAvista + recebidoParcelasCartao) * 100
  ) / 100;

  // --- Custos do split (de resumo_mensal) ---
  const resumos = (resumoRes.data ?? []) as Record<string, unknown>[];
  const sum = (key: string) => resumos.reduce((a, r) => a + Number(r[key] ?? 0), 0);

  const custosProcedimentos = sum("total_custos_procedimentos");
  const custoMaoObra = sum("total_custo_mao_obra");
  const taxaCartaoCobrada = sum("total_taxa_cartao");
  const impostoNfCobrado = sum("total_imposto_nf");
  const comissoesMedicasResumo = sum("total_comissoes_medicas");

  // --- DRE BS (mesma lógica do Faturamento, usando totalRecebido como base) ---
  const percentualBs = configRes?.percentual_beauty_smile ?? 60;
  const valorLiquidoRecebido = totalRecebido - custosProcedimentos - custoMaoObra
    - taxaCartaoCobrada - impostoNfCobrado - comissoesMedicasResumo;
  const valorBeautySmile60 = Math.round(valorLiquidoRecebido * percentualBs / 100 * 100) / 100;

  const receitaBsBruta = custosProcedimentos + custoMaoObra + taxaCartaoCobrada
    + impostoNfCobrado + comissoesMedicasResumo + valorBeautySmile60;

  const receitaPosTaxas = receitaBsBruta - taxaReal;

  const comissaoDentista = ((comDentistaRes.data ?? []) as Record<string, unknown>[])
    .reduce((a, r) => a + Number(r.valor_comissao ?? 0), 0);

  const totalDespesas = despesasPorCategoria.reduce((s, c) => s + c.total, 0);

  const resultadoUnidade = receitaPosTaxas - comissaoDentista - totalDespesas;

  return {
    recebidoPix: Math.round(recebidoPix * 100) / 100,
    recebidoDinheiro: Math.round(recebidoDinheiro * 100) / 100,
    recebidoDebitoAvista: Math.round(recebidoDebitoAvista * 100) / 100,
    recebidoParcelasCartao: Math.round(recebidoParcelasCartao * 100) / 100,
    totalRecebido,
    custosProcedimentos,
    custoMaoObra,
    taxaCartaoCobrada,
    impostoNfCobrado,
    comissoesMedicas: comissoesMedicasResumo,
    valorBeautySmile60,
    receitaBsBruta,
    taxaRealCartao: taxaReal,
    receitaPosTaxas,
    comissaoDentista,
    despesasPorCategoria,
    totalDespesas,
    resultadoUnidade,
  };
}

/* ------------------------------------------------------------------ */
/*  DRE Beauty Smile por unidade — cálculo completo                    */
/* ------------------------------------------------------------------ */

export async function calcularDreBsUnidade(
  mesReferencia: string,
  clinicaId?: string,
): Promise<DreBsUnidadeData> {
  const empty: DreBsUnidadeData = {
    custosProcedimentos: 0, custoMaoObra: 0, taxaCartaoCobrada: 0,
    impostoNfCobrado: 0, comissoesMedicas: 0, valorBeautySmile60: 0,
    receitaBsBruta: 0, taxaRealCartao: 0, receitaPosTaxas: 0,
    comissaoDentista: 0, despesasPorCategoria: [], totalDespesas: 0,
    resultadoUnidade: 0,
  };

  const supabase = await createSupabaseServerClient();

  // 1. Buscar resumo_mensal para receita BS
  let resumoQ = supabase
    .from("resumo_mensal")
    .select("total_custos_procedimentos, total_custo_mao_obra, total_taxa_cartao, total_imposto_nf, total_comissoes_medicas, valor_beauty_smile");

  // 2. Buscar comissões dentista
  let comDentistaQ = supabase
    .from("comissoes_dentista")
    .select("valor_comissao");

  if (mesReferencia !== "all") {
    const start = firstDayOfMonth(mesReferencia);
    const end = lastDayOfMonth(mesReferencia);
    resumoQ = resumoQ.gte("mes_referencia", start).lte("mes_referencia", end);
    comDentistaQ = comDentistaQ.gte("mes_referencia", start).lte("mes_referencia", end);
  }
  if (clinicaId) {
    resumoQ = resumoQ.eq("clinica_id", clinicaId);
    comDentistaQ = comDentistaQ.eq("clinica_id", clinicaId);
  }

  const [resumoRes, comDentistaRes, taxaRealCartao, despesasPorCategoria] = await Promise.all([
    resumoQ,
    comDentistaQ,
    calcularTaxaRealCartao(mesReferencia, clinicaId),
    fetchDespesasPorCategoria(mesReferencia, clinicaId),
  ]);

  if (resumoRes.error) {
    console.error("[calcularDreBsUnidade] Erro resumo:", resumoRes.error.message);
    return empty;
  }
  if (comDentistaRes.error) {
    console.error("[calcularDreBsUnidade] Erro comissoes_dentista:", comDentistaRes.error.message);
    return empty;
  }

  const resumos = (resumoRes.data ?? []) as Record<string, unknown>[];
  const sum = (key: string) => resumos.reduce((a, r) => a + Number(r[key] ?? 0), 0);

  const custosProcedimentos = sum("total_custos_procedimentos");
  const custoMaoObra = sum("total_custo_mao_obra");
  const taxaCartaoCobrada = sum("total_taxa_cartao");
  const impostoNfCobrado = sum("total_imposto_nf");
  const comissoesMedicas = sum("total_comissoes_medicas");
  const valorBeautySmile60 = sum("valor_beauty_smile");

  const receitaBsBruta = custosProcedimentos + custoMaoObra + taxaCartaoCobrada
    + impostoNfCobrado + comissoesMedicas + valorBeautySmile60;

  const receitaPosTaxas = receitaBsBruta - taxaRealCartao;

  const comissaoDentista = ((comDentistaRes.data ?? []) as Record<string, unknown>[])
    .reduce((a, r) => a + Number(r.valor_comissao ?? 0), 0);

  const totalDespesas = despesasPorCategoria.reduce((s, c) => s + c.total, 0);

  const resultadoUnidade = receitaPosTaxas - comissaoDentista - totalDespesas;

  return {
    custosProcedimentos,
    custoMaoObra,
    taxaCartaoCobrada,
    impostoNfCobrado,
    comissoesMedicas,
    valorBeautySmile60,
    receitaBsBruta,
    taxaRealCartao,
    receitaPosTaxas,
    comissaoDentista,
    despesasPorCategoria,
    totalDespesas,
    resultadoUnidade,
  };
}

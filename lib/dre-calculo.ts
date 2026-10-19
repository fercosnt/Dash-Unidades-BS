import type { SupabaseClient } from "@supabase/supabase-js";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/utils/date-helpers";
import type { DreBsUnidadeData, DreRecebiveisData } from "@/types/dashboard.types";

/**
 * Núcleo do DRE Beauty Smile (faturamento e recebíveis), das despesas por categoria e da
 * taxa real de cartão — recebe o client Supabase por parâmetro, então serve tanto às telas
 * do admin (sessão com cookies, via `lib/despesas-queries.ts`) quanto ao relatório do
 * fechamento (client admin, sem cookies, via `lib/fechamento/relatorio.ts`).
 *
 * Arquivo SEM "use server" de propósito: funções que recebem client não podem virar
 * Server Action. Erros de consulta são LANÇADOS; quem chama decide se cai para vazio.
 */

type Db = SupabaseClient;

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

export type DespesaPorCategoria = { categoriaId: string; categoria: string; total: number };

export type TaxaCartaoReal = {
  id: string;
  modalidade: string;
  bandeira: string;
  numeroParcelas: number | null;
  taxaPercentual: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function falhar(onde: string, error: { message: string } | null) {
  if (error) throw new Error(`[${onde}] ${error.message}`);
}

/** Intervalo do mês ("all" = sem filtro de data). */
function intervalo(mesReferencia: string) {
  if (mesReferencia === "all") return null;
  return { start: firstDayOfMonth(mesReferencia), end: lastDayOfMonth(mesReferencia) };
}

/* ------------------------------------------------------------------ */
/*  Despesas                                                           */
/* ------------------------------------------------------------------ */

export async function listarDespesas(db: Db, mesReferencia: string, clinicaId?: string): Promise<DespesaItem[]> {
  let q = db
    .from("despesas_operacionais")
    .select("id, clinica_id, mes_referencia, categoria_id, descricao, valor, recorrente, clinicas_parceiras(nome), categorias_despesa(nome)")
    .order("created_at", { ascending: false });

  const periodo = intervalo(mesReferencia);
  if (periodo) q = q.gte("mes_referencia", periodo.start).lte("mes_referencia", periodo.end);
  if (clinicaId) q = q.eq("clinica_id", clinicaId);

  const { data, error } = await q;
  falhar("listarDespesas", error);

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

/** Agrupa despesas por categoria (maior total primeiro). Função pura. */
export function agruparDespesasPorCategoria(despesas: DespesaItem[]): DespesaPorCategoria[] {
  const map = new Map<string, DespesaPorCategoria>();
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

/* ------------------------------------------------------------------ */
/*  Taxas reais de cartão                                              */
/* ------------------------------------------------------------------ */

export async function listarTaxasCartaoVigentes(db: Db): Promise<TaxaCartaoReal[]> {
  const { data, error } = await db
    .from("taxas_cartao_reais")
    .select("id, modalidade, bandeira, numero_parcelas, taxa_percentual")
    .is("vigencia_fim", null)
    .order("bandeira")
    .order("modalidade")
    .order("numero_parcelas");
  falhar("listarTaxasCartaoVigentes", error);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    modalidade: String(r.modalidade),
    bandeira: String(r.bandeira),
    numeroParcelas: r.numero_parcelas,
    taxaPercentual: Number(r.taxa_percentual),
  }));
}

/**
 * Taxa real de cartão dos pagamentos do mês/clínica, pela bandeira do pagamento
 * (NULL = 'visa_master'). "all" = todos os meses.
 */
export async function calcularTaxaRealCartaoCom(db: Db, mesReferencia: string, clinicaId?: string): Promise<number> {
  let pagQ = db
    .from("pagamentos")
    .select("valor, forma, parcelas, bandeira")
    .in("forma", ["cartao_credito", "cartao_debito"]);

  const periodo = intervalo(mesReferencia);
  if (periodo) pagQ = pagQ.gte("data_pagamento", periodo.start).lte("data_pagamento", periodo.end);
  if (clinicaId) pagQ = pagQ.eq("clinica_id", clinicaId);

  const [pagRes, taxas] = await Promise.all([pagQ, listarTaxasCartaoVigentes(db)]);
  falhar("calcularTaxaRealCartao", pagRes.error);

  // Lookup: "visa_master_credito_3" → 2.19, "outros_debito_null" → 1.49
  const taxaMap = new Map<string, number>();
  for (const t of taxas) taxaMap.set(`${t.bandeira}_${t.modalidade}_${t.numeroParcelas}`, t.taxaPercentual);

  let totalTaxa = 0;
  for (const pag of pagRes.data ?? []) {
    const p = pag as Record<string, unknown>;
    const forma = String(p.forma);
    const valor = Number(p.valor);
    const parcelas = Number(p.parcelas ?? 1);
    const bandeira = String(p.bandeira ?? "visa_master");
    const key = forma === "cartao_credito" ? `${bandeira}_credito_${parcelas}` : `${bandeira}_debito_null`;
    const taxa = taxaMap.get(key) ?? 0;
    totalTaxa += round2((valor * taxa) / 100);
  }

  return round2(totalTaxa);
}

/* ------------------------------------------------------------------ */
/*  DRE helpers                                                        */
/* ------------------------------------------------------------------ */

async function percentualBsVigente(db: Db): Promise<number> {
  const { data, error } = await db
    .from("configuracoes_financeiras")
    .select("percentual_beauty_smile")
    .is("vigencia_fim", null)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(`[configuracoes_financeiras] ${error.message}`);
  return Number((data as { percentual_beauty_smile?: number } | null)?.percentual_beauty_smile ?? 60);
}

/** Comissão da dentista entra como despesa da Beauty Smile (linha dentro do grupo de despesas). */
function despesasComComissao(despesas: DespesaPorCategoria[], comissaoDentista: number) {
  const linhas = [...despesas];
  if (comissaoDentista > 0) {
    linhas.push({ categoriaId: "comissao-dentista", categoria: "Comissão Dentista", total: comissaoDentista });
  }
  return { despesasPorCategoria: linhas, totalDespesas: linhas.reduce((s, c) => s + c.total, 0) };
}

/* ------------------------------------------------------------------ */
/*  DRE Recebíveis — visão caixa (o que entrou na conta)               */
/* ------------------------------------------------------------------ */

/**
 * DRE de recebíveis: quanto dinheiro efetivamente entrou na conta no mês.
 * - Pix, dinheiro, débito e crédito à vista (1x): contados pelo pagamento no mês
 * - Crédito parcelado (>1x): via parcelas_cartao com status='recebido'
 * - Taxa real: sobre transações de cartão do mês
 */
export async function calcularDreRecebiveisCom(db: Db, mesReferencia: string, clinicaId?: string): Promise<DreRecebiveisData> {
  const periodo = intervalo(mesReferencia);

  let pagQ = db.from("pagamentos").select("valor, forma, parcelas");
  if (periodo) pagQ = pagQ.gte("data_pagamento", periodo.start).lte("data_pagamento", periodo.end);
  if (clinicaId) pagQ = pagQ.eq("clinica_id", clinicaId);

  let parcQ = db.from("parcelas_cartao").select("valor_parcela").eq("status", "recebido");
  if (periodo) parcQ = parcQ.gte("mes_recebimento", periodo.start).lte("mes_recebimento", periodo.end);
  if (clinicaId) parcQ = parcQ.eq("clinica_id", clinicaId);

  let resumoQ = db
    .from("resumo_mensal")
    .select("total_custos_procedimentos, total_custo_mao_obra, total_taxa_cartao, total_imposto_nf, total_comissoes_medicas");
  if (periodo) resumoQ = resumoQ.gte("mes_referencia", periodo.start).lte("mes_referencia", periodo.end);
  if (clinicaId) resumoQ = resumoQ.eq("clinica_id", clinicaId);

  let comDentistaQ = db.from("comissoes_dentista").select("valor_comissao");
  if (periodo) comDentistaQ = comDentistaQ.gte("mes_referencia", periodo.start).lte("mes_referencia", periodo.end);
  if (clinicaId) comDentistaQ = comDentistaQ.eq("clinica_id", clinicaId);

  const [pagRes, parcRes, taxaReal, resumoRes, percentualBs, comDentistaRes, despesas] = await Promise.all([
    pagQ,
    parcQ,
    calcularTaxaRealCartaoCom(db, mesReferencia, clinicaId),
    resumoQ,
    percentualBsVigente(db),
    comDentistaQ,
    listarDespesas(db, mesReferencia, clinicaId),
  ]);
  falhar("calcularDreRecebiveis/pagamentos", pagRes.error);
  falhar("calcularDreRecebiveis/parcelas", parcRes.error);
  falhar("calcularDreRecebiveis/resumo", resumoRes.error);
  falhar("calcularDreRecebiveis/comissoes_dentista", comDentistaRes.error);

  // --- Entradas (caixa) ---
  let recebidoPix = 0;
  let recebidoDinheiro = 0;
  let recebidoDebitoAvista = 0;
  for (const pag of pagRes.data ?? []) {
    const p = pag as Record<string, unknown>;
    const valor = Number(p.valor);
    const forma = String(p.forma);
    const parcelas = Number(p.parcelas ?? 1);
    if (forma === "pix") recebidoPix += valor;
    else if (forma === "dinheiro") recebidoDinheiro += valor;
    else if (forma === "cartao_debito") recebidoDebitoAvista += valor;
    else if (forma === "cartao_credito" && parcelas <= 1) recebidoDebitoAvista += valor;
  }
  const recebidoParcelasCartao = (parcRes.data ?? []).reduce(
    (s, r) => s + Number((r as Record<string, unknown>).valor_parcela ?? 0),
    0
  );
  const totalRecebido = round2(recebidoPix + recebidoDinheiro + recebidoDebitoAvista + recebidoParcelasCartao);

  // --- Custos do split (de resumo_mensal) ---
  const resumos = (resumoRes.data ?? []) as Record<string, unknown>[];
  const sum = (key: string) => resumos.reduce((a, r) => a + Number(r[key] ?? 0), 0);
  const custosProcedimentos = sum("total_custos_procedimentos");
  const custoMaoObra = sum("total_custo_mao_obra");
  const taxaCartaoCobrada = sum("total_taxa_cartao");
  const impostoNfCobrado = sum("total_imposto_nf");
  const comissoesMedicasResumo = sum("total_comissoes_medicas");

  // --- DRE BS (mesma lógica do Faturamento, usando totalRecebido como base) ---
  const valorLiquidoRecebido =
    totalRecebido - custosProcedimentos - custoMaoObra - taxaCartaoCobrada - impostoNfCobrado - comissoesMedicasResumo;
  const valorBeautySmile60 = round2((valorLiquidoRecebido * percentualBs) / 100);
  const receitaBsBruta =
    custosProcedimentos + custoMaoObra + taxaCartaoCobrada + impostoNfCobrado + comissoesMedicasResumo + valorBeautySmile60;
  const receitaPosTaxas = receitaBsBruta - taxaReal;

  const comissaoDentista = ((comDentistaRes.data ?? []) as Record<string, unknown>[]).reduce(
    (a, r) => a + Number(r.valor_comissao ?? 0),
    0
  );
  const { despesasPorCategoria, totalDespesas } = despesasComComissao(agruparDespesasPorCategoria(despesas), comissaoDentista);

  return {
    recebidoPix: round2(recebidoPix),
    recebidoDinheiro: round2(recebidoDinheiro),
    recebidoDebitoAvista: round2(recebidoDebitoAvista),
    recebidoParcelasCartao: round2(recebidoParcelasCartao),
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
    resultadoUnidade: receitaPosTaxas - totalDespesas,
  };
}

/* ------------------------------------------------------------------ */
/*  DRE Beauty Smile por unidade (faturamento)                         */
/* ------------------------------------------------------------------ */

export async function calcularDreBsUnidadeCom(db: Db, mesReferencia: string, clinicaId?: string): Promise<DreBsUnidadeData> {
  const periodo = intervalo(mesReferencia);

  let resumoQ = db
    .from("resumo_mensal")
    .select("total_custos_procedimentos, total_custo_mao_obra, total_taxa_cartao, total_imposto_nf, total_comissoes_medicas, valor_beauty_smile");
  let comDentistaQ = db.from("comissoes_dentista").select("valor_comissao");
  if (periodo) {
    resumoQ = resumoQ.gte("mes_referencia", periodo.start).lte("mes_referencia", periodo.end);
    comDentistaQ = comDentistaQ.gte("mes_referencia", periodo.start).lte("mes_referencia", periodo.end);
  }
  if (clinicaId) {
    resumoQ = resumoQ.eq("clinica_id", clinicaId);
    comDentistaQ = comDentistaQ.eq("clinica_id", clinicaId);
  }

  const [resumoRes, comDentistaRes, taxaRealCartao, despesas] = await Promise.all([
    resumoQ,
    comDentistaQ,
    calcularTaxaRealCartaoCom(db, mesReferencia, clinicaId),
    listarDespesas(db, mesReferencia, clinicaId),
  ]);
  falhar("calcularDreBsUnidade/resumo", resumoRes.error);
  falhar("calcularDreBsUnidade/comissoes_dentista", comDentistaRes.error);

  const resumos = (resumoRes.data ?? []) as Record<string, unknown>[];
  const sum = (key: string) => resumos.reduce((a, r) => a + Number(r[key] ?? 0), 0);
  const custosProcedimentos = sum("total_custos_procedimentos");
  const custoMaoObra = sum("total_custo_mao_obra");
  const taxaCartaoCobrada = sum("total_taxa_cartao");
  const impostoNfCobrado = sum("total_imposto_nf");
  const comissoesMedicas = sum("total_comissoes_medicas");
  const valorBeautySmile60 = sum("valor_beauty_smile");

  const receitaBsBruta =
    custosProcedimentos + custoMaoObra + taxaCartaoCobrada + impostoNfCobrado + comissoesMedicas + valorBeautySmile60;
  const receitaPosTaxas = receitaBsBruta - taxaRealCartao;

  const comissaoDentista = ((comDentistaRes.data ?? []) as Record<string, unknown>[]).reduce(
    (a, r) => a + Number(r.valor_comissao ?? 0),
    0
  );
  const { despesasPorCategoria, totalDespesas } = despesasComComissao(agruparDespesasPorCategoria(despesas), comissaoDentista);

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
    resultadoUnidade: receitaPosTaxas - totalDespesas,
  };
}

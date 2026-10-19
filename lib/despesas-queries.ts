"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DreBsUnidadeData, DreRecebiveisData } from "@/types/dashboard.types";
import {
  agruparDespesasPorCategoria,
  calcularDreBsUnidadeCom,
  calcularDreRecebiveisCom,
  calcularTaxaRealCartaoCom,
  listarDespesas,
  listarTaxasCartaoVigentes,
  type DespesaItem as DespesaItemBase,
  type TaxaCartaoReal,
} from "@/lib/dre-calculo";

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
/*  Despesas, taxa real e DREs — wrappers com a sessão do usuário.     */
/*  O cálculo mora em lib/dre-calculo.ts (client por parâmetro, também */
/*  usado pelo relatório do fechamento). Aqui erro vira vazio + log,   */
/*  como as telas sempre esperaram.                                    */
/* ------------------------------------------------------------------ */

export type DespesaItem = DespesaItemBase;

export async function fetchDespesasPorMes(
  mesReferencia: string,
  clinicaId?: string,
): Promise<DespesaItem[]> {
  try {
    return await listarDespesas(await createSupabaseServerClient(), mesReferencia, clinicaId);
  } catch (e) {
    console.error("[fetchDespesasPorMes]", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function fetchDespesasPorCategoria(
  mesReferencia: string,
  clinicaId?: string,
): Promise<{ categoriaId: string; categoria: string; total: number }[]> {
  return agruparDespesasPorCategoria(await fetchDespesasPorMes(mesReferencia, clinicaId));
}

export async function fetchTotalDespesasMes(
  mesReferencia: string,
  clinicaId?: string,
): Promise<number> {
  const porCategoria = await fetchDespesasPorCategoria(mesReferencia, clinicaId);
  return porCategoria.reduce((s, c) => s + c.total, 0);
}

export async function fetchTaxasCartaoVigentes(): Promise<TaxaCartaoReal[]> {
  try {
    return await listarTaxasCartaoVigentes(await createSupabaseServerClient());
  } catch (e) {
    console.error("[fetchTaxasCartaoVigentes]", e instanceof Error ? e.message : e);
    return [];
  }
}

/** Taxa real de cartão dos pagamentos do mês/clínica ("all" = todos os meses). */
export async function calcularTaxaRealCartao(
  mesReferencia: string,
  clinicaId?: string,
): Promise<number> {
  try {
    return await calcularTaxaRealCartaoCom(await createSupabaseServerClient(), mesReferencia, clinicaId);
  } catch (e) {
    console.error("[calcularTaxaRealCartao]", e instanceof Error ? e.message : e);
    return 0;
  }
}

const DRE_VAZIO: DreBsUnidadeData = {
  custosProcedimentos: 0, custoMaoObra: 0, taxaCartaoCobrada: 0,
  impostoNfCobrado: 0, comissoesMedicas: 0, valorBeautySmile60: 0,
  receitaBsBruta: 0, taxaRealCartao: 0, receitaPosTaxas: 0,
  comissaoDentista: 0, despesasPorCategoria: [], totalDespesas: 0,
  resultadoUnidade: 0,
};

/** DRE Recebíveis — visão caixa ("all" = todos os meses). */
export async function calcularDreRecebiveis(
  mesReferencia: string,
  clinicaId?: string,
): Promise<DreRecebiveisData> {
  try {
    return await calcularDreRecebiveisCom(await createSupabaseServerClient(), mesReferencia, clinicaId);
  } catch (e) {
    console.error("[calcularDreRecebiveis]", e instanceof Error ? e.message : e);
    return {
      ...DRE_VAZIO,
      despesasPorCategoria: [],
      recebidoPix: 0, recebidoDinheiro: 0, recebidoDebitoAvista: 0,
      recebidoParcelasCartao: 0, totalRecebido: 0,
    };
  }
}

/** DRE Beauty Smile por unidade — faturamento ("all" = todos os meses). */
export async function calcularDreBsUnidade(
  mesReferencia: string,
  clinicaId?: string,
): Promise<DreBsUnidadeData> {
  try {
    return await calcularDreBsUnidadeCom(await createSupabaseServerClient(), mesReferencia, clinicaId);
  } catch (e) {
    console.error("[calcularDreBsUnidade]", e instanceof Error ? e.message : e);
    return { ...DRE_VAZIO, despesasPorCategoria: [] };
  }
}

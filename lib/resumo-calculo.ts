import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getConfigVigente } from "@/app/admin/configuracoes/financeiro/actions";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/utils/date-helpers";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula e persiste o resumo mensal para uma clínica e mês.
 * Usado por POST /api/resumo/calcular e POST /api/resumo/recalcular.
 */
export async function calcularEPersistirResumo(
  clinicaId: string,
  mesReferencia: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = await getConfigVigente();
  if (!config) {
    return { ok: false, error: "Configure os parâmetros financeiros (Configurações > Financeiro) antes de calcular o resumo." };
  }

  const start = firstDayOfMonth(mesReferencia);
  const end = lastDayOfMonth(mesReferencia);
  const admin = createSupabaseAdminClient();

  const { data: clinica, error: errClinica } = await admin
    .from("clinicas_parceiras")
    .select("custo_mao_de_obra")
    .eq("id", clinicaId)
    .single();
  if (errClinica || !clinica) {
    return { ok: false, error: "Clínica não encontrada." };
  }

  const custoMaoDeObra = Number(clinica.custo_mao_de_obra ?? 0);

  const { data: orcamentosFechados, error: errOrcamentos } = await admin
    .from("orcamentos_fechados")
    .select("id, valor_total, valor_pago, valor_em_aberto, status, medico_indicador_id")
    .eq("clinica_id", clinicaId)
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);

  if (errOrcamentos) {
    console.error("[calcularEPersistirResumo] Erro ao buscar orcamentos_fechados:", errOrcamentos.message);
    return { ok: false, error: "Erro ao buscar orçamentos fechados: " + errOrcamentos.message };
  }

  const faturamentoBruto = (orcamentosFechados ?? []).reduce(
    (s, r) => s + Number(r.valor_total ?? 0),
    0
  );
  const totalInadimplente = (orcamentosFechados ?? []).reduce((s, r) => {
    if (r.status === "em_aberto" || r.status === "parcial") {
      return s + Number(r.valor_em_aberto ?? 0);
    }
    return s;
  }, 0);

  const { data: tratamentos, error: errTratamentos } = await admin
    .from("tratamentos_executados")
    .select("id, quantidade, procedimento_id, procedimentos(custo_fixo)")
    .eq("clinica_id", clinicaId)
    .gte("mes_referencia", start)
    .lte("mes_referencia", end);

  if (errTratamentos) {
    console.error("[calcularEPersistirResumo] Erro ao buscar tratamentos_executados:", errTratamentos.message);
    return { ok: false, error: "Erro ao buscar tratamentos: " + errTratamentos.message };
  }

  const totalCustosProcedimentos = (tratamentos ?? []).reduce((s, r) => {
    const qtd = Number(r.quantidade ?? 1);
    const proc = r.procedimentos as { custo_fixo: number } | { custo_fixo: number }[] | null;
    const p = Array.isArray(proc) ? proc[0] : proc;
    const custo = p?.custo_fixo;
    if (custo != null) return s + Number(custo) * qtd;
    return s;
  }, 0);

  const taxaCartaoPct = Number(config.taxa_cartao_percentual ?? 0) / 100;
  const impostoNfPct = Number(config.imposto_nf_percentual ?? 0) / 100;
  const totalTaxaCartao = round2(faturamentoBruto * taxaCartaoPct);
  const totalImpostoNf = round2(faturamentoBruto * impostoNfPct);

  const orcamentosComMedico = (orcamentosFechados ?? []).filter((o) => o.medico_indicador_id);
  const idsMedicos = Array.from(new Set(orcamentosComMedico.map((o) => o.medico_indicador_id))) as string[];
  let totalComissoesMedicas = 0;
  if (idsMedicos.length > 0) {
    const { data: medicos, error: errMedicos } = await admin
      .from("medicos_indicadores")
      .select("id, percentual_comissao")
      .in("id", idsMedicos);
    if (errMedicos) {
      console.error("[calcularEPersistirResumo] Erro ao buscar medicos_indicadores:", errMedicos.message);
      return { ok: false, error: "Erro ao buscar médicos indicadores: " + errMedicos.message };
    }
    const pctByMedico: Record<string, number> = {};
    (medicos ?? []).forEach((m) => {
      pctByMedico[m.id] = Number(m.percentual_comissao ?? 0) / 100;
    });
    totalComissoesMedicas = orcamentosComMedico.reduce(
      (s, o) => s + Number(o.valor_total ?? 0) * (pctByMedico[o.medico_indicador_id as string] ?? 0),
      0
    );
    totalComissoesMedicas = round2(totalComissoesMedicas);
  }

  const valorLiquido = round2(
    faturamentoBruto -
      totalCustosProcedimentos -
      custoMaoDeObra -
      totalTaxaCartao -
      totalImpostoNf -
      totalComissoesMedicas
  );
  const pctBs = Number(config.percentual_beauty_smile ?? 60) / 100;
  const valorBeautySmile = round2(valorLiquido * pctBs);
  const valorClinica = round2(valorLiquido - valorBeautySmile);

  const { data: parcelasRecebidas, error: errParcelas } = await admin
    .from("parcelas_cartao")
    .select("valor_parcela")
    .eq("clinica_id", clinicaId)
    .eq("status", "recebido")
    .gte("mes_recebimento", start)
    .lte("mes_recebimento", end);
  if (errParcelas) {
    console.error("[calcularEPersistirResumo] Erro ao buscar parcelas_cartao (recebidas):", errParcelas.message);
    return { ok: false, error: "Erro ao buscar parcelas recebidas: " + errParcelas.message };
  }
  const totalRecebidoParcelas = (parcelasRecebidas ?? []).reduce(
    (s, r) => s + Number(r.valor_parcela ?? 0),
    0
  );

  const { data: pagamentosDiretos, error: errPagamentos } = await admin
    .from("pagamentos")
    .select("valor, forma")
    .eq("clinica_id", clinicaId)
    .gte("data_pagamento", start)
    .lte("data_pagamento", end);
  if (errPagamentos) {
    console.error("[calcularEPersistirResumo] Erro ao buscar pagamentos:", errPagamentos.message);
    return { ok: false, error: "Erro ao buscar pagamentos: " + errPagamentos.message };
  }
  const formasCartao = ["cartao_credito", "cartao_debito"];
  const totalRecebidoDireto = (pagamentosDiretos ?? []).reduce((s, r) => {
    if (formasCartao.includes(String(r.forma))) return s;
    return s + Number(r.valor ?? 0);
  }, 0);
  const totalRecebidoMes = round2(totalRecebidoParcelas + totalRecebidoDireto);

  const { data: parcelasFuturas, error: errFuturas } = await admin
    .from("parcelas_cartao")
    .select("valor_parcela")
    .eq("clinica_id", clinicaId)
    .eq("status", "projetado");
  if (errFuturas) {
    console.error("[calcularEPersistirResumo] Erro ao buscar parcelas_cartao (projetadas):", errFuturas.message);
    return { ok: false, error: "Erro ao buscar parcelas futuras: " + errFuturas.message };
  }
  const totalRecebimentosFuturos = (parcelasFuturas ?? []).reduce(
    (s, r) => s + Number(r.valor_parcela ?? 0),
    0
  );

  // A Receber = inadimplente + parcelas futuras projetadas
  const totalAReceberMes = totalInadimplente + totalRecebimentosFuturos;

  const row = {
    clinica_id: clinicaId,
    mes_referencia: start,
    faturamento_bruto: round2(faturamentoBruto),
    total_custos_procedimentos: round2(totalCustosProcedimentos),
    total_custo_mao_obra: round2(custoMaoDeObra),
    total_taxa_cartao: totalTaxaCartao,
    total_imposto_nf: totalImpostoNf,
    total_comissoes_medicas: totalComissoesMedicas,
    valor_liquido: valorLiquido,
    valor_beauty_smile: valorBeautySmile,
    valor_clinica: valorClinica,
    total_recebido_mes: totalRecebidoMes,
    total_a_receber_mes: round2(totalAReceberMes),
    total_inadimplente: round2(totalInadimplente),
    total_recebimentos_futuros: round2(totalRecebimentosFuturos),
    status: "processado" as const,
    calculado_em: new Date().toISOString(),
  };

  const { error: upsertErr } = await admin.from("resumo_mensal").upsert(row, {
    onConflict: "clinica_id,mes_referencia",
    ignoreDuplicates: false,
  });

  if (upsertErr) {
    return { ok: false, error: upsertErr.message || "Erro ao salvar resumo" };
  }
  return { ok: true };
}

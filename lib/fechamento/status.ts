import type { SupabaseClient } from "@supabase/supabase-js";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/utils/date-helpers";
import { buscarFechamentoVigente } from "@/lib/fechamento/fechar";

const PCT_MINIMO_PAGO = 0.3; // regra dos 30%: alerta só no fechamento (decisão 2026-10-19)

type Nivel = "ok" | "atencao" | "pendente";

export type ItemChecklist = { passo: string; nivel: Nivel; resumo: string; detalhes?: unknown };

export type StatusFechamento = {
  clinicaId: string;
  mes: string;
  fechado: boolean;
  fechamento: { id: string; fechado_por: string | null; fechado_em: string } | null;
  checklist: ItemChecklist[];
};

/**
 * Monta o checklist do fechamento de uma clínica/mês a partir do banco.
 * Não consulta Clinicorp nem Rede: a conferência com as fontes é feita pelo plugin,
 * que compara com os números devolvidos aqui.
 */
export async function montarStatusFechamento(
  admin: SupabaseClient,
  clinicaId: string,
  mesReferencia: string
): Promise<StatusFechamento> {
  const mes = mesReferencia.slice(0, 7);
  const start = firstDayOfMonth(mes);
  const end = lastDayOfMonth(mes);
  const mesAnterior = firstDayOfMonth(
    new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 2, 1).toISOString().slice(0, 7)
  );

  const [fechamento, ultimoSync, orcamentos, pagamentos, tratamentos, despesas, despesasAnt, comissoes, dentistas, resumo] =
    await Promise.all([
      buscarFechamentoVigente(admin, clinicaId, mes),
      admin
        .from("sync_logs")
        .select("status, recalculo_ok, error_message, created_at")
        .eq("clinica_id", clinicaId)
        .eq("mes_referencia", start)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("orcamentos_fechados")
        .select("id, paciente_nome, valor_total, valor_pago, data_fechamento, tem_indicacao, medico_indicador_id, clinicorp_treatment_id")
        .eq("clinica_id", clinicaId)
        .gte("mes_referencia", start)
        .lte("mes_referencia", end)
        .order("data_fechamento"),
      admin
        .from("pagamentos")
        .select("id, valor, forma, parcelas, data_pagamento, clinicorp_payment_id")
        .eq("clinica_id", clinicaId)
        .gte("data_pagamento", start)
        .lte("data_pagamento", end),
      admin
        .from("tratamentos_executados")
        .select("procedimento_id, procedimentos(custo_fixo)")
        .eq("clinica_id", clinicaId)
        .eq("mes_referencia", start),
      admin
        .from("despesas_operacionais")
        .select("valor, descricao, categoria_id, categorias_despesa(nome)")
        .eq("clinica_id", clinicaId)
        .eq("mes_referencia", start),
      admin
        .from("despesas_operacionais")
        .select("categoria_id, descricao, valor, categorias_despesa(nome)")
        .eq("clinica_id", clinicaId)
        .eq("mes_referencia", mesAnterior)
        .eq("recorrente", true),
      admin
        .from("comissoes_dentista")
        .select("dentista_id, qtde_vendas, base_calculo, valor_comissao, status")
        .eq("clinica_id", clinicaId)
        .eq("mes_referencia", start),
      admin.from("dentistas").select("id, nome").eq("clinica_id", clinicaId).eq("ativo", true),
      admin.from("resumo_mensal").select("*").eq("clinica_id", clinicaId).eq("mes_referencia", start).maybeSingle(),
    ]);

  const checklist: ItemChecklist[] = [];

  // 0. Saúde do sync
  const sync = ultimoSync.data;
  checklist.push(
    !sync
      ? { passo: "sync", nivel: "atencao", resumo: "Nenhum sync registrado para este mês" }
      : sync.status !== "success" && sync.status !== "skipped"
        ? { passo: "sync", nivel: "atencao", resumo: `Último sync com erro: ${sync.error_message ?? sync.status}`, detalhes: sync }
        : { passo: "sync", nivel: sync.recalculo_ok || sync.status === "skipped" ? "ok" : "atencao", resumo: `Último sync ${sync.status} em ${sync.created_at}`, detalhes: sync }
  );

  // 1. Orçamentos
  const orcs = orcamentos.data ?? [];
  const vendas = orcs.filter((o) => Number(o.valor_total) > 0);
  checklist.push({
    passo: "orcamentos",
    nivel: "ok",
    resumo: `${vendas.length} vendas (R$ ${soma(vendas, "valor_total")}) + ${orcs.length - vendas.length} cortesias`,
    detalhes: orcs,
  });

  // 2. Pagamentos + regra dos 30%
  const pags = pagamentos.data ?? [];
  const abaixo30 = vendas.filter((o) => Number(o.valor_pago) < Number(o.valor_total) * PCT_MINIMO_PAGO);
  checklist.push({
    passo: "pagamentos",
    nivel: abaixo30.length ? "atencao" : "ok",
    resumo: `${pags.length} pagamentos (R$ ${soma(pags, "valor")})` +
      (abaixo30.length ? ` · ${abaixo30.length} venda(s) com menos de 30% pago` : ""),
    detalhes: { pagamentos: pags, abaixo30 },
  });

  // 3. Procedimentos
  const trats = tratamentos.data ?? [];
  const semProc = trats.filter((t) => !t.procedimento_id).length;
  const custo = trats.reduce((s, t) => s + Number((t.procedimentos as { custo_fixo?: number } | null)?.custo_fixo ?? 0), 0);
  checklist.push({
    passo: "procedimentos",
    nivel: trats.length === 0 ? "pendente" : semProc ? "atencao" : "ok",
    resumo: trats.length === 0 ? "Planilha de procedimentos não importada" : `${trats.length} linhas · custo R$ ${round2(custo)}` + (semProc ? ` · ${semProc} sem procedimento` : ""),
  });

  // 4. Indicações
  const indicSemMedico = orcs.filter((o) => o.tem_indicacao && !o.medico_indicador_id);
  checklist.push({
    passo: "indicacoes",
    nivel: indicSemMedico.length ? "atencao" : "ok",
    resumo: indicSemMedico.length ? `${indicSemMedico.length} marcada(s) como indicação sem médico` : "Sem pendências",
    detalhes: indicSemMedico,
  });

  // 5. Despesas (recorrentes do mês anterior que faltam neste mês)
  const desp = despesas.data ?? [];
  const catsNoMes = new Set(desp.map((d) => d.categoria_id));
  const faltando = (despesasAnt.data ?? []).filter((d) => !catsNoMes.has(d.categoria_id));
  checklist.push({
    passo: "despesas",
    nivel: desp.length === 0 ? "pendente" : faltando.length ? "atencao" : "ok",
    resumo: `${desp.length} lançada(s) (R$ ${soma(desp, "valor")})` + (faltando.length ? ` · ${faltando.length} recorrente(s) do mês anterior faltando` : ""),
    detalhes: { lancadas: desp, recorrentesFaltando: faltando },
  });

  // 6. Comissão da dentista (desatualizada se base/qtde não batem com o mês)
  const fat = Number(resumo.data?.faturamento_bruto ?? 0);
  const coms = comissoes.data ?? [];
  const dents = dentistas.data ?? [];
  const desatualizadas = coms.filter((c) => c.status !== "pago" && (Number(c.base_calculo) !== fat || c.qtde_vendas !== vendas.length));
  const semComissao = dents.filter((d) => !coms.some((c) => c.dentista_id === d.id));
  checklist.push({
    passo: "comissao_dentista",
    nivel: semComissao.length || desatualizadas.length ? "pendente" : "ok",
    resumo: semComissao.length
      ? "Comissão não calculada"
      : desatualizadas.length
        ? "Comissão desatualizada (base ou vendas mudaram)"
        : `R$ ${soma(coms, "valor_comissao")}`,
    detalhes: coms,
  });

  // 8. Resumo
  checklist.push({
    passo: "resumo",
    nivel: resumo.data ? "ok" : "pendente",
    resumo: resumo.data
      ? `Faturamento R$ ${fat} · líquido R$ ${resumo.data.valor_liquido} · recebido R$ ${resumo.data.total_recebido_mes}`
      : "Resumo não calculado",
    detalhes: resumo.data,
  });

  return {
    clinicaId,
    mes,
    fechado: Boolean(fechamento),
    fechamento: fechamento ? { id: fechamento.id, fechado_por: fechamento.fechado_por, fechado_em: fechamento.fechado_em } : null,
    checklist,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function soma<T extends Record<string, unknown>>(rows: T[], campo: keyof T) {
  return round2(rows.reduce((s, r) => s + Number(r[campo] ?? 0), 0));
}

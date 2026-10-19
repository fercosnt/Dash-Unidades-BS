import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/utils/date-helpers";
import { montarContaCorrente } from "@/lib/conta-corrente";
import { calcularDreBsUnidadeCom, calcularDreRecebiveisCom } from "@/lib/dre-calculo";
import { buscarFechamentoVigente, type Decisao, type Divergencia } from "@/lib/fechamento/fechar";
import { montarStatusFechamento } from "@/lib/fechamento/status";
import type { DreBsUnidadeData, DreRecebiveisData } from "@/types/dashboard.types";

/**
 * Relatório mensal de uma clínica parceira, em dois tipos:
 *
 * - `parceiro`: o que a clínica pode ver. Montado SÓ a partir de consultas a dados do
 *   parceiro e passado no final pelo `schemaRelatorioParceiro` — uma WHITELIST de campos
 *   (z.object descarta qualquer chave não declarada, em todos os níveis). Nada de despesas,
 *   salário/comissão da dentista, taxa real de cartão, receita/resultado da BS, decisões
 *   e divergências do fechamento, regras de procedimento ou usuários internos: essas
 *   tabelas nem são consultadas neste tipo.
 * - `interno`: tudo do parceiro + bloco `interno` (DREs BS, margem do dentista, decisões,
 *   divergências, pendências e alertas).
 *
 * A separação é garantida aqui, no servidor; a skill do plugin só formata.
 */

export type TipoRelatorio = "interno" | "parceiro";

const valor = z.number();

const schemaLinhaExtrato = z.object({
  mes: z.string(),
  tipo: z.enum(["abertura", "resultado", "pagamento_implementacao", "repasse"]),
  valor,
  saldo: valor,
});

/** Whitelist do relatório do parceiro. Toda chave fora daqui é descartada no parse. */
export const schemaRelatorioParceiro = z.object({
  tipo: z.literal("parceiro"),
  clinica: z.object({ id: z.string(), nome: z.string() }),
  mes: z.string(),
  gerado_em: z.string(),
  fechamento: z.object({ fechado: z.boolean(), fechado_em: z.string().nullable() }),
  vendas: z.object({
    quantidade: z.number(),
    cortesias: z.number(),
    lista: z.array(z.object({ paciente: z.string(), data_aprovacao: z.string().nullable(), valor })),
  }),
  calculo: z.object({
    resumo_calculado: z.boolean(),
    faturamento_bruto: valor,
    custos: z.object({
      procedimentos: z.object({
        total: valor,
        itens: z.array(z.object({ procedimento: z.string(), quantidade: z.number(), custo_unitario: valor, total: valor })),
      }),
      mao_de_obra: valor,
      taxa_cartao: valor,
      imposto_nf: valor,
      comissoes_medicas: valor,
      total: valor,
    }),
    valor_liquido: valor,
    percentual_beauty_smile: z.number(),
    percentual_parceiro: z.number(),
    parte_beauty_smile: valor,
    parte_parceiro: valor,
  }),
  recebimentos: z.object({ recebido_no_mes: valor, parcelas_futuras_das_vendas_do_mes: valor }),
  inadimplencia: z.object({
    posicao_em: z.string(),
    em_aberto_vendas_do_mes: valor,
    total_em_aberto: valor,
    devedores: z.array(
      z.object({ paciente: z.string(), mes_da_venda: z.string(), valor_total: valor, valor_pago: valor, valor_em_aberto: valor })
    ),
  }),
  conta_corrente: z.object({
    saldo_atual: valor,
    saldo_fim_do_mes: valor,
    resultado_do_mes: valor,
    repasses_do_mes: valor,
    pagamentos_implementacao_do_mes: valor,
    taxa_implementacao: z.object({ valor_total: valor, a_amortizar: valor }).nullable(),
    operacional_acumulado: valor,
    competencia_acumulada: valor,
    extrato: z.array(schemaLinhaExtrato),
  }),
  comparativo_mes_anterior: z
    .object({ mes: z.string(), faturamento_bruto: valor, valor_liquido: valor, parte_parceiro: valor })
    .nullable(),
});

export type RelatorioParceiro = z.infer<typeof schemaRelatorioParceiro>;

export type DadosInternos = {
  dre_faturamento: DreBsUnidadeData;
  dre_recebiveis: DreRecebiveisData;
  margem_dentista: { mao_de_obra_cobrada: number; salario_dentista: number; comissao_dentista: number; margem: number };
  fechamento: { fechado_por: string | null; decisoes: Decisao[]; divergencias: Divergencia[] };
  pendencias: { passo: string; nivel: string; resumo: string }[];
  alertas: string[];
};

export type RelatorioInterno = Omit<RelatorioParceiro, "tipo"> & { tipo: "interno"; interno: DadosInternos };

export type Relatorio = RelatorioParceiro | RelatorioInterno;

export type OpcoesRelatorio = {
  /** Client autenticado com o token do admin, para a RPC de resultado mensal (guard de tenant). */
  rpc?: SupabaseClient;
  /** Relógio injetável (testes). */
  agora?: () => Date;
};

export class ErroRelatorio extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "ErroRelatorio";
  }
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => Number(v ?? 0) || 0;

/** "2026-01" → "2025-12". */
export function mesAnterior(mes: string): string {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

function falhar(onde: string, error: { message: string } | null) {
  if (error) throw new Error(`[relatorio/${onde}] ${error.message}`);
}

type Procedimento = { nome?: string; custo_fixo?: number } | null;

/** Agrupa os procedimentos executados: qtde × procedimento × custo unitário. Função pura. */
export function agruparProcedimentos(
  linhas: { quantidade?: number | null; procedimento_id: string | null; procedimentos: Procedimento | Procedimento[] }[]
) {
  const mapa = new Map<string, { procedimento: string; quantidade: number; custo_unitario: number }>();
  for (const l of linhas) {
    if (!l.procedimento_id) continue;
    const p = Array.isArray(l.procedimentos) ? l.procedimentos[0] : l.procedimentos;
    const atual = mapa.get(l.procedimento_id) ?? { procedimento: String(p?.nome ?? "Procedimento"), quantidade: 0, custo_unitario: num(p?.custo_fixo) };
    atual.quantidade += Number(l.quantidade ?? 1);
    mapa.set(l.procedimento_id, atual);
  }
  return [...mapa.values()]
    .map((i) => ({ ...i, total: r2(i.quantidade * i.custo_unitario) }))
    .sort((a, b) => b.total - a.total || a.procedimento.localeCompare(b.procedimento));
}

/**
 * Parte do parceiro: consulta apenas clínica, fechamento (data), orçamentos, procedimentos
 * executados, resumo_mensal, config do split e a conta corrente. Devolve o objeto já
 * passado pela whitelist.
 */
async function montarParteParceiro(
  db: SupabaseClient,
  clinicaId: string,
  mes: string,
  opts: OpcoesRelatorio
): Promise<RelatorioParceiro> {
  const start = firstDayOfMonth(mes);
  const end = lastDayOfMonth(mes);
  const anterior = firstDayOfMonth(mesAnterior(mes));
  const colunasResumo =
    "faturamento_bruto, total_custos_procedimentos, total_custo_mao_obra, total_taxa_cartao, total_imposto_nf, total_comissoes_medicas, valor_liquido, valor_beauty_smile, valor_clinica, total_recebido_mes, total_recebimentos_futuros";

  const [clinica, fechamento, orcamentos, emAberto, tratamentos, resumo, resumoAnt, config, conta] = await Promise.all([
    db.from("clinicas_parceiras").select("id, nome").eq("id", clinicaId).maybeSingle(),
    db
      .from("fechamentos")
      .select("fechado_em")
      .eq("clinica_id", clinicaId)
      .eq("mes_referencia", start)
      .eq("status", "fechado")
      .maybeSingle(),
    db
      .from("orcamentos_fechados")
      .select("paciente_nome, data_fechamento, valor_total, valor_em_aberto")
      .eq("clinica_id", clinicaId)
      .gte("mes_referencia", start)
      .lte("mes_referencia", end)
      .order("data_fechamento"),
    db
      .from("orcamentos_fechados")
      .select("paciente_nome, mes_referencia, valor_total, valor_pago, valor_em_aberto")
      .eq("clinica_id", clinicaId)
      .in("status", ["em_aberto", "parcial"])
      .order("mes_referencia"),
    db
      .from("tratamentos_executados")
      .select("quantidade, procedimento_id, procedimentos(nome, custo_fixo)")
      .eq("clinica_id", clinicaId)
      .gte("mes_referencia", start)
      .lte("mes_referencia", end),
    db.from("resumo_mensal").select(colunasResumo).eq("clinica_id", clinicaId).eq("mes_referencia", start).maybeSingle(),
    db.from("resumo_mensal").select(colunasResumo).eq("clinica_id", clinicaId).eq("mes_referencia", anterior).maybeSingle(),
    db.from("configuracoes_financeiras").select("percentual_beauty_smile").is("vigencia_fim", null).maybeSingle(),
    montarContaCorrente(db, clinicaId, { rpc: opts.rpc, estrito: true }),
  ]);
  falhar("clinica", clinica.error);
  if (!clinica.data) throw new ErroRelatorio("Clínica não encontrada", 404);
  falhar("fechamento", fechamento.error);
  falhar("orcamentos", orcamentos.error);
  falhar("em_aberto", emAberto.error);
  falhar("tratamentos", tratamentos.error);
  falhar("resumo", resumo.error);
  falhar("resumo_anterior", resumoAnt.error);
  falhar("config", config.error);

  const orcs = (orcamentos.data ?? []) as Record<string, unknown>[];
  const vendas = orcs.filter((o) => num(o.valor_total) > 0);
  const rm = (resumo.data ?? null) as Record<string, unknown> | null;
  const ra = (resumoAnt.data ?? null) as Record<string, unknown> | null;
  const pctBs = num((config.data as Record<string, unknown> | null)?.percentual_beauty_smile ?? 60);

  const custos = {
    procedimentos: {
      total: num(rm?.total_custos_procedimentos),
      itens: agruparProcedimentos((tratamentos.data ?? []) as Parameters<typeof agruparProcedimentos>[0]),
    },
    mao_de_obra: num(rm?.total_custo_mao_obra),
    taxa_cartao: num(rm?.total_taxa_cartao),
    imposto_nf: num(rm?.total_imposto_nf),
    comissoes_medicas: num(rm?.total_comissoes_medicas),
    total: 0,
  };
  custos.total = r2(custos.procedimentos.total + custos.mao_de_obra + custos.taxa_cartao + custos.imposto_nf + custos.comissoes_medicas);

  const devedores = ((emAberto.data ?? []) as Record<string, unknown>[])
    .filter((o) => num(o.valor_em_aberto) > 0)
    .map((o) => ({
      paciente: String(o.paciente_nome ?? ""),
      mes_da_venda: String(o.mes_referencia ?? "").slice(0, 7),
      valor_total: num(o.valor_total),
      valor_pago: num(o.valor_pago),
      valor_em_aberto: num(o.valor_em_aberto),
    }))
    .sort((a, b) => b.valor_em_aberto - a.valor_em_aberto);

  const extrato = conta.extrato;
  const doMes = extrato.filter((l) => l.mes === mes);
  const somaTipo = (tipo: string) => r2(doMes.filter((l) => l.tipo === tipo).reduce((s, l) => s + l.valor, 0));
  const saldoFimDoMes = extrato.filter((l) => l.mes <= mes).at(-1)?.saldo ?? 0;

  const relatorio: RelatorioParceiro = {
    tipo: "parceiro",
    clinica: { id: String(clinica.data.id), nome: String(clinica.data.nome) },
    mes,
    gerado_em: (opts.agora?.() ?? new Date()).toISOString(),
    fechamento: {
      fechado: Boolean(fechamento.data),
      fechado_em: fechamento.data ? String((fechamento.data as Record<string, unknown>).fechado_em) : null,
    },
    vendas: {
      quantidade: vendas.length,
      cortesias: orcs.length - vendas.length,
      lista: vendas.map((o) => ({
        paciente: String(o.paciente_nome ?? ""),
        data_aprovacao: o.data_fechamento ? String(o.data_fechamento) : null,
        valor: num(o.valor_total),
      })),
    },
    calculo: {
      resumo_calculado: Boolean(rm),
      faturamento_bruto: num(rm?.faturamento_bruto),
      custos,
      valor_liquido: num(rm?.valor_liquido),
      percentual_beauty_smile: pctBs,
      percentual_parceiro: r2(100 - pctBs),
      parte_beauty_smile: num(rm?.valor_beauty_smile),
      parte_parceiro: num(rm?.valor_clinica),
    },
    recebimentos: {
      recebido_no_mes: num(rm?.total_recebido_mes),
      parcelas_futuras_das_vendas_do_mes: num(rm?.total_recebimentos_futuros),
    },
    inadimplencia: {
      posicao_em: (opts.agora?.() ?? new Date()).toISOString().slice(0, 10),
      em_aberto_vendas_do_mes: r2(vendas.reduce((s, o) => s + Math.max(0, num(o.valor_em_aberto)), 0)),
      total_em_aberto: r2(devedores.reduce((s, d) => s + d.valor_em_aberto, 0)),
      devedores,
    },
    conta_corrente: {
      saldo_atual: conta.saldo,
      saldo_fim_do_mes: saldoFimDoMes,
      resultado_do_mes: somaTipo("resultado"),
      repasses_do_mes: Math.abs(somaTipo("repasse")),
      pagamentos_implementacao_do_mes: somaTipo("pagamento_implementacao"),
      taxa_implementacao: conta.dividaImplementacao
        ? { valor_total: conta.dividaImplementacao.valorTotal, a_amortizar: conta.dividaImplementacao.aAmortizar }
        : null,
      operacional_acumulado: conta.operacionalAcumulado,
      competencia_acumulada: conta.competenciaAcumulada,
      extrato: extrato.filter((l) => l.mes <= mes),
    },
    comparativo_mes_anterior: ra
      ? {
          mes: mesAnterior(mes),
          faturamento_bruto: num(ra.faturamento_bruto),
          valor_liquido: num(ra.valor_liquido),
          parte_parceiro: num(ra.valor_clinica),
        }
      : null,
  };

  // Whitelist: descarta qualquer chave não declarada (ex.: refId do extrato).
  return schemaRelatorioParceiro.parse(relatorio);
}

const ehSalarioDentista = (categoria: string) =>
  /sal[aá]rio.*dentista/i.test(categoria.normalize("NFC"));

/** Alertas para a gestão (pontos de atenção do relatório interno). Função pura. */
export function calcularAlertas(base: RelatorioParceiro, interno: Omit<DadosInternos, "alertas">): string[] {
  const a: string[] = [];
  const c = base.calculo;
  if (!c.resumo_calculado) a.push("Resumo do mês não calculado — números zerados até recalcular.");
  if (c.valor_liquido < 0) a.push(`Valor líquido negativo no mês (${c.valor_liquido.toFixed(2)}): custos maiores que o faturamento.`);
  if (interno.dre_faturamento.resultadoUnidade < 0) {
    a.push(`Resultado da unidade p/ BS negativo no faturamento (${interno.dre_faturamento.resultadoUnidade.toFixed(2)}).`);
  }
  if (interno.dre_recebiveis.resultadoUnidade < 0) {
    a.push(`Resultado da unidade p/ BS negativo no caixa (${interno.dre_recebiveis.resultadoUnidade.toFixed(2)}).`);
  }
  if (c.faturamento_bruto > 0 && base.inadimplencia.em_aberto_vendas_do_mes / c.faturamento_bruto > 0.2) {
    const pct = Math.round((base.inadimplencia.em_aberto_vendas_do_mes / c.faturamento_bruto) * 100);
    a.push(`Inadimplência alta: ${pct}% das vendas do mês ainda em aberto.`);
  }
  const somaItens = r2(c.custos.procedimentos.itens.reduce((s, i) => s + i.total, 0));
  if (c.resumo_calculado && Math.abs(somaItens - c.custos.procedimentos.total) > 0.01) {
    a.push(`Custo de procedimentos do resumo (${c.custos.procedimentos.total.toFixed(2)}) difere do detalhado (${somaItens.toFixed(2)}) — recalcular o resumo.`);
  }
  if (interno.margem_dentista.margem < 0) a.push(`Margem da BS no dentista negativa (${interno.margem_dentista.margem.toFixed(2)}).`);
  if (interno.fechamento.divergencias.length) a.push(`${interno.fechamento.divergencias.length} divergência(s) aceita(s) no fechamento.`);
  if (interno.pendencias.length) a.push(`Mês aberto com ${interno.pendencias.length} pendência(s) no checklist.`);
  return a;
}

async function montarParteInterna(
  db: SupabaseClient,
  clinicaId: string,
  mes: string,
  base: RelatorioParceiro
): Promise<DadosInternos> {
  const [dreFat, dreRec, fechamento] = await Promise.all([
    calcularDreBsUnidadeCom(db, mes, clinicaId),
    calcularDreRecebiveisCom(db, mes, clinicaId),
    buscarFechamentoVigente(db, clinicaId, mes),
  ]);
  const pendencias = fechamento
    ? []
    : (await montarStatusFechamento(db, clinicaId, mes)).checklist
        .filter((i) => i.nivel !== "ok")
        .map(({ passo, nivel, resumo }) => ({ passo, nivel, resumo }));

  const salario = r2(
    dreFat.despesasPorCategoria.filter((d) => ehSalarioDentista(d.categoria)).reduce((s, d) => s + d.total, 0)
  );
  const maoDeObra = base.calculo.custos.mao_de_obra;
  const parcial = {
    dre_faturamento: dreFat,
    dre_recebiveis: dreRec,
    margem_dentista: {
      mao_de_obra_cobrada: maoDeObra,
      salario_dentista: salario,
      comissao_dentista: r2(dreFat.comissaoDentista),
      margem: r2(maoDeObra - salario - dreFat.comissaoDentista),
    },
    fechamento: {
      fechado_por: fechamento?.fechado_por ?? null,
      decisoes: (fechamento?.decisoes ?? []) as Decisao[],
      divergencias: (fechamento?.divergencias ?? []) as Divergencia[],
    },
    pendencias,
  };
  return { ...parcial, alertas: calcularAlertas(base, parcial) };
}

/**
 * Monta o relatório mensal. `tipo: "parceiro"` devolve só a whitelist (sem consultar as
 * tabelas internas); `tipo: "interno"` acrescenta o bloco `interno`.
 */
export async function montarRelatorio(
  admin: SupabaseClient,
  clinicaId: string,
  mes: string,
  tipo: TipoRelatorio,
  opts: OpcoesRelatorio = {}
): Promise<Relatorio> {
  const m = mes.slice(0, 7);
  const parceiro = await montarParteParceiro(admin, clinicaId, m, opts);
  if (tipo === "parceiro") return parceiro;
  if (tipo !== "interno") throw new ErroRelatorio(`Tipo de relatório inválido: ${String(tipo)}`);
  const interno = await montarParteInterna(admin, clinicaId, m, parceiro);
  return { ...parceiro, tipo: "interno", interno };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { montarStatusFechamento } from "@/lib/fechamento/status";
import { buscarFechamentoVigente, fecharMesClinica, reabrirMesClinica } from "@/lib/fechamento/fechar";
import { mapearProcedimentos, type RegraProcedimento } from "@/lib/fechamento/mapear-procedimentos";
import { calcularEPersistirResumo } from "@/lib/resumo-calculo";
import { calcularEPersistirComissaoDentista } from "@/lib/comissao-dentista-calculo";
import { syncClinicaMonth } from "@/lib/clinicorp-sync";
import { firstDayOfMonth } from "@/lib/utils/date-helpers";
import { schemaClinicaMes, schemasAcao, type AcaoPost, type ClinicaMes, type InputAcao } from "@/lib/fechamento/schemas";

export { schemaClinicaMes, schemasAcao, type AcaoPost, type InputAcao };

/**
 * Ações do fechamento mensal — fonte única das regras de orquestração usadas pela
 * API REST (`app/api/fechamento/[acao]`) e pelo servidor MCP remoto (`app/api/mcp`).
 *
 * Cada função recebe o contexto autenticado (`{ admin, userId }`) e o input JÁ validado
 * pelos schemas de `lib/fechamento/schemas.ts`, devolve o resultado ou lança `ErroFechamento` (mensagem em PT +
 * status HTTP sugerido). Erros inesperados sobem como `Error` comum.
 */

export type ContextoFechamento = { admin: SupabaseClient; userId: string };

export class ErroFechamento extends Error {
  constructor(
    message: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "ErroFechamento";
  }
}

// ---------- leitura ----------

export async function statusFechamento({ admin }: ContextoFechamento, input: ClinicaMes) {
  return montarStatusFechamento(admin, input.clinica_id, input.mes);
}

export type Catalogo = {
  clinicas: { id: string; nome: string; clinicorp_subscriber_id: string | null }[];
  procedimentos: { id: string; nome: string; custo_fixo: number; categoria: string | null }[];
  regras: Record<string, unknown>[];
  medicos: { id: string; nome: string; clinica_id: string | null; percentual_comissao: number }[];
  categorias_despesa: { id: string; nome: string }[];
  dentistas: { id: string; nome: string; clinica_id: string | null }[];
};

/** Catálogo do sistema; com `clinicaId`, filtra regras/médicos/dentistas da clínica + globais. */
export async function catalogoFechamento({ admin }: ContextoFechamento, clinicaId = ""): Promise<Catalogo> {
  const [clinicas, procedimentos, regras, medicos, categorias, dentistas] = await Promise.all([
    admin.from("clinicas_parceiras").select("id, nome, clinicorp_subscriber_id").eq("ativo", true),
    admin.from("procedimentos").select("id, nome, custo_fixo, categoria").eq("ativo", true).order("nome"),
    admin.from("regras_procedimento").select("*").eq("ativo", true).order("prioridade"),
    admin.from("medicos_indicadores").select("id, nome, clinica_id, percentual_comissao").eq("ativo", true),
    admin.from("categorias_despesa").select("id, nome").eq("ativo", true).order("nome"),
    admin.from("dentistas").select("id, nome, clinica_id").eq("ativo", true),
  ]);
  const doClinica = <T extends { clinica_id: string | null }>(rows: T[] | null) =>
    (rows ?? []).filter((r) => !clinicaId || r.clinica_id === null || r.clinica_id === clinicaId);
  return {
    clinicas: clinicas.data ?? [],
    procedimentos: procedimentos.data ?? [],
    regras: doClinica(regras.data),
    medicos: doClinica(medicos.data),
    categorias_despesa: categorias.data ?? [],
    dentistas: doClinica(dentistas.data),
  };
}

export async function mapearProcedimentosMes({ admin }: ContextoFechamento, input: InputAcao<"mapear-procedimentos">) {
  const [regras, catalogo] = await Promise.all([
    admin.from("regras_procedimento").select("id, padrao, procedimento_id, ignorar, prioridade, clinica_id").eq("ativo", true),
    admin.from("procedimentos").select("id, nome, custo_fixo").eq("ativo", true),
  ]);
  return mapearProcedimentos(
    input.linhas,
    (regras.data ?? []) as RegraProcedimento[],
    (catalogo.data ?? []).map((p) => ({ ...p, custo_fixo: Number(p.custo_fixo) })),
    input.clinica_id
  );
}

// ---------- escrita ----------

/** Ações que escrevem dados do mês exigem o mês aberto. */
export async function exigirMesAberto({ admin }: ContextoFechamento, clinicaId: string, mesRef: string) {
  if (await buscarFechamentoVigente(admin, clinicaId, mesRef)) {
    throw new ErroFechamento(`Mês ${mesRef} está fechado para esta clínica. Reabra antes de alterar.`, 409);
  }
}

export async function sincronizarMes(ctx: ContextoFechamento, input: InputAcao<"sync">) {
  await exigirMesAberto(ctx, input.clinica_id, input.mes);
  return syncClinicaMonth(input.clinica_id, firstDayOfMonth(input.mes), { trigger: "manual", userId: ctx.userId });
}

export async function gravarProcedimentosMes(ctx: ContextoFechamento, input: InputAcao<"procedimentos">) {
  await exigirMesAberto(ctx, input.clinica_id, input.mes);
  const linhas = input.linhas.map((l) => ({
    paciente_nome: l.paciente,
    procedimento_id: l.procedimento_id,
    procedimento_nome: l.texto_original,
    data_execucao: l.data,
    profissional: l.profissional ?? null,
    valor: l.valor ?? 0,
  }));
  const { data, error } = await ctx.admin.rpc("substituir_tratamentos_mes", {
    p_clinica_id: input.clinica_id,
    p_mes: firstDayOfMonth(input.mes),
    p_linhas: linhas,
  });
  if (error) throw new ErroFechamento(error.message);
  return { inseridas: data as number };
}

export async function criarRegraProcedimento({ admin, userId }: ContextoFechamento, input: InputAcao<"regras">) {
  if (!input.ignorar && !input.procedimento_id) throw new ErroFechamento("Informe procedimento_id ou ignorar=true");
  const { data, error } = await admin
    .from("regras_procedimento")
    .insert({ ...input, criado_por: userId })
    .select("*")
    .single();
  if (error) throw new ErroFechamento(error.message);
  return data as Record<string, unknown>;
}

export async function definirIndicacao(ctx: ContextoFechamento, input: InputAcao<"indicacao">) {
  const { data: orc } = await ctx.admin
    .from("orcamentos_fechados")
    .select("clinica_id, mes_referencia")
    .eq("id", input.orcamento_id)
    .single();
  if (!orc) throw new ErroFechamento("Orçamento não encontrado", 404);
  if (await buscarFechamentoVigente(ctx.admin, orc.clinica_id, String(orc.mes_referencia))) {
    throw new ErroFechamento("Mês do orçamento está fechado. Reabra antes de alterar.", 409);
  }
  const { error } = await ctx.admin
    .from("orcamentos_fechados")
    .update({ medico_indicador_id: input.medico_indicador_id, tem_indicacao: input.medico_indicador_id !== null })
    .eq("id", input.orcamento_id);
  if (error) throw new ErroFechamento(error.message);
  return { ok: true as const };
}

export async function lancarDespesa(ctx: ContextoFechamento, input: InputAcao<"despesas">) {
  await exigirMesAberto(ctx, input.clinica_id, input.mes);
  const { data: cat } = await ctx.admin
    .from("categorias_despesa")
    .select("id")
    .ilike("nome", input.categoria)
    .eq("ativo", true)
    .maybeSingle();
  if (!cat) throw new ErroFechamento(`Categoria não encontrada: ${input.categoria}`);
  const { data, error } = await ctx.admin
    .from("despesas_operacionais")
    .insert({
      clinica_id: input.clinica_id,
      mes_referencia: firstDayOfMonth(input.mes),
      categoria_id: cat.id,
      descricao: input.descricao ?? null,
      valor: input.valor,
      recorrente: input.recorrente,
    })
    .select("id")
    .single();
  if (error) throw new ErroFechamento(error.message);
  return data as { id: string };
}

export async function recalcularComissaoDentista(ctx: ContextoFechamento, input: InputAcao<"comissao-dentista">) {
  await exigirMesAberto(ctx, input.clinica_id, input.mes);
  const { data: dentistas } = await ctx.admin
    .from("dentistas")
    .select("id, nome")
    .eq("clinica_id", input.clinica_id)
    .eq("ativo", true);
  if (!dentistas?.length) throw new ErroFechamento("Nenhuma dentista ativa na clínica");
  const resultados = [];
  for (const d of dentistas) {
    resultados.push({ dentista: d.nome, ...(await calcularEPersistirComissaoDentista(ctx.admin, d.id, input.clinica_id, input.mes)) });
  }
  return { resultados };
}

export async function recalcularResumo(ctx: ContextoFechamento, input: InputAcao<"recalcular">) {
  await exigirMesAberto(ctx, input.clinica_id, input.mes);
  const r = await calcularEPersistirResumo(input.clinica_id, input.mes);
  if (!r.ok) throw new ErroFechamento(r.error);
  return { ok: true as const };
}

export async function fecharMes(ctx: ContextoFechamento, input: InputAcao<"fechar">) {
  await exigirMesAberto(ctx, input.clinica_id, input.mes);
  const r = await fecharMesClinica(ctx.admin, {
    clinicaId: input.clinica_id,
    mes: input.mes,
    userId: ctx.userId,
    decisoes: input.decisoes,
    divergencias: input.divergencias,
  });
  if (!r.ok) throw new ErroFechamento(r.error);
  return r;
}

export async function reabrirMes(ctx: ContextoFechamento, input: InputAcao<"reabrir">) {
  const r = await reabrirMesClinica(ctx.admin, { clinicaId: input.clinica_id, mes: input.mes, userId: ctx.userId, motivo: input.motivo });
  if (!r.ok) throw new ErroFechamento(r.error);
  return r;
}

/** Despacho por nome de ação (usado pela rota REST). */
export const acoesPost: { [A in AcaoPost]: (ctx: ContextoFechamento, input: InputAcao<A>) => Promise<unknown> } = {
  sync: sincronizarMes,
  "mapear-procedimentos": mapearProcedimentosMes,
  procedimentos: gravarProcedimentosMes,
  regras: criarRegraProcedimento,
  indicacao: definirIndicacao,
  despesas: lancarDespesa,
  "comissao-dentista": recalcularComissaoDentista,
  recalcular: recalcularResumo,
  fechar: fecharMes,
  reabrir: reabrirMes,
};

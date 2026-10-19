import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularEPersistirResumo } from "@/lib/resumo-calculo";
import { firstDayOfMonth } from "@/lib/utils/date-helpers";

type Resultado = { ok: true; fechamentoId: string } | { ok: false; error: string };

export type Decisao = { passo?: string; texto: string };
export type Divergencia = { passo?: string; fonte?: string; descricao: string; valor?: number };

/** Fechamento vigente (status 'fechado') da clínica no mês, se houver. */
export async function buscarFechamentoVigente(admin: SupabaseClient, clinicaId: string, mes: string) {
  const { data } = await admin
    .from("fechamentos")
    .select("id, fechado_por, fechado_em, snapshot, decisoes, divergencias")
    .eq("clinica_id", clinicaId)
    .eq("mes_referencia", firstDayOfMonth(mes.slice(0, 7)))
    .eq("status", "fechado")
    .maybeSingle();
  return data;
}

/**
 * Fecha o mês de UMA clínica: recalcula o resumo, grava o snapshot (resumo + despesas +
 * comissão da dentista) com as decisões/divergências do fechamento e trava o mês.
 */
export async function fecharMesClinica(
  admin: SupabaseClient,
  params: { clinicaId: string; mes: string; userId: string; decisoes?: Decisao[]; divergencias?: Divergencia[] }
): Promise<Resultado> {
  const mes = params.mes.slice(0, 7);
  const mesRef = firstDayOfMonth(mes);

  if (await buscarFechamentoVigente(admin, params.clinicaId, mes)) {
    return { ok: false, error: `Mês ${mes} já está fechado para esta clínica.` };
  }

  const calc = await calcularEPersistirResumo(params.clinicaId, mes);
  if (!calc.ok) return { ok: false, error: "Recálculo do resumo falhou: " + calc.error };

  const [resumo, despesas, comissoes] = await Promise.all([
    admin.from("resumo_mensal").select("*").eq("clinica_id", params.clinicaId).eq("mes_referencia", mesRef).maybeSingle(),
    admin
      .from("despesas_operacionais")
      .select("valor, descricao, categorias_despesa(nome)")
      .eq("clinica_id", params.clinicaId)
      .eq("mes_referencia", mesRef),
    admin
      .from("comissoes_dentista")
      .select("dentista_id, qtde_vendas, percentual, base_calculo, valor_comissao, status")
      .eq("clinica_id", params.clinicaId)
      .eq("mes_referencia", mesRef),
  ]);
  if (resumo.error || !resumo.data) return { ok: false, error: "Resumo do mês não encontrado após recálculo." };

  const resumoSnapshot = { ...(resumo.data as Record<string, unknown>) };
  delete resumoSnapshot.id;
  const snapshot = {
    resumo: resumoSnapshot,
    despesas: despesas.data ?? [],
    comissoes_dentista: comissoes.data ?? [],
  };

  const agora = new Date().toISOString();
  const { data: fechamento, error } = await admin
    .from("fechamentos")
    .insert({
      clinica_id: params.clinicaId,
      mes_referencia: mesRef,
      status: "fechado",
      fechado_por: params.userId,
      fechado_em: agora,
      snapshot,
      decisoes: params.decisoes ?? [],
      divergencias: params.divergencias ?? [],
    })
    .select("id")
    .single();
  if (error || !fechamento) return { ok: false, error: error?.message ?? "Erro ao registrar fechamento" };

  const { error: errResumo } = await admin
    .from("resumo_mensal")
    .update({ fechado_em: agora, fechado_por: params.userId })
    .eq("clinica_id", params.clinicaId)
    .eq("mes_referencia", mesRef);
  if (errResumo) return { ok: false, error: "Fechamento registrado, mas falhou ao travar o resumo: " + errResumo.message };

  return { ok: true, fechamentoId: fechamento.id };
}

/** Reabre o mês de UMA clínica (mantém o fechamento anterior como histórico). */
export async function reabrirMesClinica(
  admin: SupabaseClient,
  params: { clinicaId: string; mes: string; userId: string; motivo: string }
): Promise<Resultado> {
  const mes = params.mes.slice(0, 7);
  const mesRef = firstDayOfMonth(mes);

  const vigente = await buscarFechamentoVigente(admin, params.clinicaId, mes);

  if (vigente) {
    const { error } = await admin
      .from("fechamentos")
      .update({
        status: "reaberto",
        reaberto_por: params.userId,
        reaberto_em: new Date().toISOString(),
        motivo_reabertura: params.motivo,
      })
      .eq("id", vigente.id);
    if (error) return { ok: false, error: error.message };
  }

  const { error: errResumo } = await admin
    .from("resumo_mensal")
    .update({ fechado_em: null, fechado_por: null })
    .eq("clinica_id", params.clinicaId)
    .eq("mes_referencia", mesRef);
  if (errResumo) return { ok: false, error: errResumo.message };

  return { ok: true, fechamentoId: vigente?.id ?? "" };
}

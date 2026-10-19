import type { SupabaseClient } from "@supabase/supabase-js";
import { montarExtrato, type LinhaExtrato } from "@/lib/utils/extrato-parceiro";

/**
 * Núcleo da conta corrente do parceiro (fonte de verdade: PRD/PRD.md) com o client por
 * parâmetro — usado pelas telas (sessão com cookies, `lib/saldo-parceiro-queries.ts`) e pelo
 * relatório do fechamento (client admin, `lib/fechamento/relatorio.ts`).
 *
 * `rpc`: client que chama `calcular_resultado_mensal_parceiro`. A RPC tem guard de tenant
 * (`is_admin() OR auth_clinica_id() = p_clinica_id`) e devolve ZERO linhas para o
 * service_role (auth.uid() nulo) — por isso, fora da sessão de cookies, passe um client
 * autenticado com o token do próprio usuário admin.
 *
 * Sem "use server": função que recebe client não pode virar Server Action.
 */

export type ContaCorrente = {
  saldo: number; // saldo atual (negativo = parceiro deve; positivo = BS deve)
  podeRepassar: boolean; // saldo > 0
  operacionalAcumulado: number; // saldo − abertura (Σ resultados + Σ pagto impl − Σ repasses)
  extrato: LinhaExtrato[];
  dividaImplementacao: {
    id: string;
    descricao: string;
    valorTotal: number;
    aAmortizar: number;
  } | null;
  competenciaAcumulada: number; // Σ valor_clinica — total que o parceiro vai ganhar
};

export type OpcoesContaCorrente = {
  /** Client da RPC de resultado mensal (padrão: o próprio `supabase`). */
  rpc?: SupabaseClient;
  /**
   * Lança erro em vez de seguir com saldo incompleto quando a RPC falha ou volta vazia
   * para uma clínica com resumo calculado (sintoma do guard de tenant). As telas mantêm o
   * comportamento antigo (não estrito); o relatório do fechamento usa estrito.
   */
  estrito?: boolean;
};

export async function montarContaCorrente(
  supabase: SupabaseClient,
  clinicaId: string,
  { rpc = supabase, estrito = false }: OpcoesContaCorrente = {}
): Promise<ContaCorrente> {
  const [{ data: resultados, error: erroRpc }, { data: repasses }, { data: resumos }, { data: debito }] =
    await Promise.all([
      rpc.rpc("calcular_resultado_mensal_parceiro", { p_clinica_id: clinicaId }),
      supabase
        .from("repasses_mensais")
        .select("id, mes_referencia, valor_repasse")
        .eq("clinica_id", clinicaId),
      supabase.from("resumo_mensal").select("valor_clinica").eq("clinica_id", clinicaId),
      supabase
        .from("debito_parceiro")
        .select("id, descricao, valor_total, valor_pago, data_inicio")
        .eq("clinica_id", clinicaId)
        .eq("status", "ativo")
        .order("data_inicio", { ascending: true })
        .limit(1),
    ]);

  if (estrito && (erroRpc || ((resultados ?? []).length === 0 && (resumos ?? []).length > 0))) {
    throw new Error(
      `Conta corrente indisponível: ${erroRpc?.message ?? "RPC calcular_resultado_mensal_parceiro sem linhas (guard de tenant)"}`
    );
  }

  // limit(1) em vez de maybeSingle: se houver >1 débito ativo, maybeSingle daria erro
  // (data null) e o saldo perderia a abertura silenciosamente, burlando a trava de repasse.
  const d = (debito as Record<string, unknown>[] | null)?.[0] ?? null;
  const saldoInicial = d ? -Number(d.valor_total) : 0;
  const mesAbertura = d ? String(d.data_inicio).slice(0, 7) : "2026-01";

  // Pagamentos da implementação em dinheiro (parceiro→BS) = abatimentos sem repasse vinculado
  let pagamentosImpl: { mes: string; valor: number }[] = [];
  if (d) {
    const { data: abat } = await supabase
      .from("abatimentos_debito")
      .select("mes_referencia, valor_abatido")
      .eq("debito_id", d.id as string)
      .is("repasse_id", null);
    pagamentosImpl = (abat ?? []).map((a: Record<string, unknown>) => ({
      mes: String(a.mes_referencia).slice(0, 7),
      valor: Number(a.valor_abatido ?? 0),
    }));
  }

  const extrato = montarExtrato(
    saldoInicial,
    mesAbertura,
    (resultados ?? []).map((r: Record<string, unknown>) => ({
      mes: String(r.mes).slice(0, 7),
      resultado: Number(r.resultado ?? 0),
    })),
    pagamentosImpl,
    (repasses ?? []).map((p: Record<string, unknown>) => ({
      mes: String(p.mes_referencia).slice(0, 7),
      valor: Number(p.valor_repasse ?? 0),
      id: String(p.id),
    }))
  );

  const saldo = extrato.at(-1)?.saldo ?? saldoInicial;
  const competenciaAcumulada =
    Math.round(
      (resumos ?? []).reduce(
        (a, r: Record<string, unknown>) => a + Number(r.valor_clinica ?? 0),
        0
      ) * 100
    ) / 100;

  return {
    saldo,
    podeRepassar: saldo > 0,
    operacionalAcumulado: Math.round((saldo - saldoInicial) * 100) / 100,
    extrato,
    dividaImplementacao: d
      ? {
          id: String(d.id),
          descricao: String(d.descricao),
          valorTotal: Number(d.valor_total),
          aAmortizar: Number(d.valor_total) - Number(d.valor_pago),
        }
      : null,
    competenciaAcumulada,
  };
}

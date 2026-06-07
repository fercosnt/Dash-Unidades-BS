"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { montarExtrato, type LinhaExtrato } from "@/lib/utils/extrato-parceiro";

export type ContaCorrente = {
  saldo: number; // saldo atual (negativo = parceiro deve; positivo = BS deve)
  podeRepassar: boolean; // saldo > 0
  operacionalAcumulado: number; // saldo − abertura (Σ resultados + Σ pagto impl − Σ repasses)
  extrato: LinhaExtrato[];
  dividaImplementacao: { descricao: string; valorTotal: number; aAmortizar: number } | null;
  competenciaAcumulada: number; // Σ valor_clinica — total que o parceiro vai ganhar
};

export async function fetchContaCorrente(clinicaId: string): Promise<ContaCorrente> {
  const supabase = await createSupabaseServerClient();

  const [{ data: resultados }, { data: repasses }, { data: resumos }, { data: debito }] =
    await Promise.all([
      supabase.rpc("calcular_resultado_mensal_parceiro", { p_clinica_id: clinicaId }),
      supabase
        .from("repasses_mensais")
        .select("mes_referencia, valor_repasse")
        .eq("clinica_id", clinicaId),
      supabase.from("resumo_mensal").select("valor_clinica").eq("clinica_id", clinicaId),
      supabase
        .from("debito_parceiro")
        .select("id, descricao, valor_total, valor_pago, data_inicio")
        .eq("clinica_id", clinicaId)
        .eq("status", "ativo")
        .maybeSingle(),
    ]);

  const d = debito as Record<string, unknown> | null;
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
          descricao: String(d.descricao),
          valorTotal: Number(d.valor_total),
          aAmortizar: Number(d.valor_total) - Number(d.valor_pago),
        }
      : null,
    competenciaAcumulada,
  };
}

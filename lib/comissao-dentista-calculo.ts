import type { SupabaseClient } from "@supabase/supabase-js";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/utils/date-helpers";

export type ResultadoComissaoDentista =
  | { ok: true; valorComissao: number; tier: number; qtdeVendas: number; baseCalculo: number }
  | { ok: false; error: string };

/**
 * Calcula e grava a comissão da dentista no mês (BS paga 100%, fora do split).
 * Base = faturamento bruto do resumo_mensal; tier pela quantidade de vendas
 * (cortesia R$ 0 não conta como venda). Comissão já paga não é sobrescrita.
 *
 * Recebe o client: a tela usa o da sessão (RLS admin), a API de fechamento usa o admin.
 */
export async function calcularEPersistirComissaoDentista(
  supabase: SupabaseClient,
  dentistaId: string,
  clinicaId: string,
  mesReferencia: string
): Promise<ResultadoComissaoDentista> {
  const mes = mesReferencia.slice(0, 7);
  const start = firstDayOfMonth(mes);
  const end = lastDayOfMonth(mes);

  const [configRes, vendas, resumo, existente] = await Promise.all([
    supabase.from("config_comissao_dentista").select("*").is("vigencia_fim", null).maybeSingle(),
    supabase
      .from("orcamentos_fechados")
      .select("id")
      .eq("clinica_id", clinicaId)
      .gt("valor_total", 0) // cortesia (R$ 0) não conta como venda para o tier
      .gte("mes_referencia", start)
      .lte("mes_referencia", end),
    supabase
      .from("resumo_mensal")
      .select("faturamento_bruto")
      .eq("clinica_id", clinicaId)
      .gte("mes_referencia", start)
      .lte("mes_referencia", end)
      .maybeSingle(),
    supabase
      .from("comissoes_dentista")
      .select("status")
      .eq("clinica_id", clinicaId)
      .eq("dentista_id", dentistaId)
      .eq("mes_referencia", start)
      .maybeSingle(),
  ]);

  if (configRes.error) return { ok: false, error: "Erro ao buscar configuração: " + configRes.error.message };
  if (vendas.error) return { ok: false, error: "Erro ao buscar vendas: " + vendas.error.message };
  if (resumo.error) return { ok: false, error: "Erro ao buscar resumo mensal: " + resumo.error.message };
  if (existente.data?.status === "pago") return { ok: false, error: "Comissão do mês já está paga." };

  const config = configRes.data as Record<string, unknown> | null;
  if (!config) return { ok: false, error: "Configuração de tiers não encontrada." };

  const qtdeVendas = (vendas.data ?? []).length;
  const faturamentoBruto = Number((resumo.data as Record<string, unknown> | null)?.faturamento_bruto ?? 0);

  let tierAplicado = 3;
  let percentual = Number(config.tier3_percentual);
  if (qtdeVendas <= Number(config.tier1_limite)) {
    tierAplicado = 1;
    percentual = Number(config.tier1_percentual);
  } else if (qtdeVendas <= Number(config.tier2_limite)) {
    tierAplicado = 2;
    percentual = Number(config.tier2_percentual);
  }

  const valorComissao = Math.round(faturamentoBruto * (percentual / 100) * 100) / 100;

  const { error } = await supabase.from("comissoes_dentista").upsert(
    {
      clinica_id: clinicaId,
      dentista_id: dentistaId,
      mes_referencia: start,
      qtde_vendas: qtdeVendas,
      tier_aplicado: tierAplicado,
      percentual,
      base_calculo: faturamentoBruto,
      valor_comissao: valorComissao,
      config_id: config.id as string,
    },
    { onConflict: "clinica_id,dentista_id,mes_referencia" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true, valorComissao, tier: tierAplicado, qtdeVendas, baseCalculo: faturamentoBruto };
}

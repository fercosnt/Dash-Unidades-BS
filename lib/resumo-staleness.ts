import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { calcularEPersistirResumo } from "@/lib/resumo-calculo";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/utils/date-helpers";

/**
 * Verifica se o resumo_mensal está desatualizado para as clínicas do filtro
 * e recalcula automaticamente antes de renderizar o dashboard.
 */
export async function autoCalcResumoSeNecessario(
  mesReferencia: string,
  clinicaId?: string
): Promise<void> {
  if (mesReferencia === "all") return;

  const admin = createSupabaseAdminClient();
  const start = firstDayOfMonth(mesReferencia);
  const end = lastDayOfMonth(mesReferencia);

  // Buscar clínicas a verificar
  let clinicaIds: string[];
  if (clinicaId) {
    clinicaIds = [clinicaId];
  } else {
    const { data, error: errClinicas } = await admin
      .from("clinicas_parceiras")
      .select("id")
      .eq("ativo", true);
    if (errClinicas) {
      console.error("[autoCalcResumoSeNecessario] Erro ao buscar clinicas_parceiras:", errClinicas.message);
      return;
    }
    clinicaIds = (data ?? []).map((r) => r.id);
  }

  if (clinicaIds.length === 0) return;

  // Verificar staleness para cada clínica em paralelo
  const checks = await Promise.allSettled(
    clinicaIds.map(async (cId) => {
      // Último cálculo
      const { data: resumo, error: errResumo } = await admin
        .from("resumo_mensal")
        .select("calculado_em")
        .eq("clinica_id", cId)
        .eq("mes_referencia", start)
        .maybeSingle();
      if (errResumo) {
        console.error(`[autoCalcResumoSeNecessario] Erro ao buscar resumo_mensal para clinica ${cId}:`, errResumo.message);
      }

      const calculadoEm = resumo?.calculado_em
        ? new Date(resumo.calculado_em).getTime()
        : 0;

      // Último upload concluído para este mês
      const { data: upload, error: errUpload } = await admin
        .from("upload_batches")
        .select("created_at")
        .eq("clinica_id", cId)
        .gte("mes_referencia", start)
        .lte("mes_referencia", end)
        .eq("status", "concluido")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (errUpload) {
        console.error(`[autoCalcResumoSeNecessario] Erro ao buscar upload_batches para clinica ${cId}:`, errUpload.message);
      }

      const uploadAt = upload?.created_at
        ? new Date(upload.created_at).getTime()
        : 0;

      // Último pagamento para este mês
      const { data: pagamento, error: errPagamento } = await admin
        .from("pagamentos")
        .select("created_at")
        .eq("clinica_id", cId)
        .gte("data_pagamento", start)
        .lte("data_pagamento", end)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (errPagamento) {
        console.error(`[autoCalcResumoSeNecessario] Erro ao buscar pagamentos para clinica ${cId}:`, errPagamento.message);
      }

      const pagamentoAt = pagamento?.created_at
        ? new Date(pagamento.created_at).getTime()
        : 0;

      const latestData = Math.max(uploadAt, pagamentoAt);

      // Stale se: nunca calculou, ou dados mais recentes que último cálculo
      const stale = calculadoEm === 0
        ? latestData > 0 // só calcula se há dados
        : latestData > calculadoEm;

      return { clinicaId: cId, stale };
    })
  );

  // Log rejected checks
  checks.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[autoCalcResumoSeNecessario] Erro ao verificar staleness para clinica ${clinicaIds[i]}:`, r.reason);
    }
  });

  // Recalcular as stale
  const staleIds = checks
    .filter(
      (r): r is PromiseFulfilledResult<{ clinicaId: string; stale: boolean }> =>
        r.status === "fulfilled" && r.value.stale
    )
    .map((r) => r.value.clinicaId);

  if (staleIds.length === 0) return;

  const recalcResults = await Promise.allSettled(
    staleIds.map((cId) => calcularEPersistirResumo(cId, mesReferencia))
  );

  recalcResults.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[autoCalcResumoSeNecessario] Erro ao recalcular resumo para clinica ${staleIds[i]}:`, r.reason);
    }
  });
}

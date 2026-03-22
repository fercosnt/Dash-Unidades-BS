import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncClinicaMonth } from "@/lib/clinicorp-sync";

export const maxDuration = 300; // Vercel Pro: 5 min

/**
 * GET /api/cron/clinicorp-sync
 * Vercel Cron: roda diariamente às 6:00 UTC (3:00 BRT).
 * Sincroniza mês atual + mês anterior para todas as clínicas com credenciais Clinicorp.
 */
export async function GET(request: Request) {
  // Validar auth do Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  // Buscar clínicas ativas com credenciais Clinicorp
  const { data: clinicas, error: clinicasError } = await admin
    .from("clinicas_parceiras")
    .select("id, nome")
    .eq("ativo", true)
    .not("clinicorp_subscriber_id", "is", null);

  if (clinicasError || !clinicas?.length) {
    return NextResponse.json({
      message: "Nenhuma clínica com credenciais Clinicorp",
      clinicas: 0,
    });
  }

  // Calcular meses a sincronizar: atual + anterior
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const mesAnteriorDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const mesAnterior = `${mesAnteriorDate.getFullYear()}-${String(mesAnteriorDate.getMonth() + 1).padStart(2, "0")}-01`;

  const meses = [mesAnterior, mesAtual];
  const results: Array<{
    clinica: string;
    mes: string;
    status: string;
    inseridos?: Record<string, number>;
    error?: string;
  }> = [];

  for (const clinica of clinicas) {
    for (const mes of meses) {
      const logId = await createSyncLog(admin, clinica.id, mes, "cron");

      try {
        const response = await syncClinicaMonth(clinica.id, mes, {
          trigger: "cron",
        });

        if (response.skipped) {
          await updateSyncLog(admin, logId, "skipped", null, response.skipReason);
          results.push({
            clinica: clinica.nome,
            mes,
            status: "skipped",
            error: response.skipReason,
          });
          continue;
        }

        const r = response.result!;
        await updateSyncLog(admin, logId, "success", r);
        results.push({
          clinica: clinica.nome,
          mes,
          status: "success",
          inseridos: {
            fechados: r.orcamentos_fechados_inseridos,
            abertos: r.orcamentos_abertos_inseridos,
            pagamentos: r.pagamentos_inseridos,
            tratamentos: r.tratamentos_inseridos,
          },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[cron/clinicorp-sync] Erro ${clinica.nome} ${mes}:`, errorMsg);
        await updateSyncLog(admin, logId, "error", null, errorMsg);
        results.push({
          clinica: clinica.nome,
          mes,
          status: "error",
          error: errorMsg,
        });
      }
    }
  }

  return NextResponse.json({
    synced_at: new Date().toISOString(),
    clinicas: clinicas.length,
    meses,
    results,
  });
}

// --- Helpers para sync_logs ---

async function createSyncLog(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  clinicaId: string,
  mesReferencia: string,
  trigger: "cron" | "manual"
): Promise<string> {
  const { data } = await admin
    .from("sync_logs")
    .insert({
      clinica_id: clinicaId,
      mes_referencia: mesReferencia,
      status: "running",
      trigger,
    })
    .select("id")
    .single();
  return data?.id ?? "";
}

async function updateSyncLog(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  logId: string,
  status: "success" | "error" | "skipped",
  result?: { orcamentos_fechados_inseridos: number; orcamentos_abertos_inseridos: number; pagamentos_inseridos: number; tratamentos_inseridos: number } | null,
  errorMessage?: string
): Promise<void> {
  if (!logId) return;
  await admin
    .from("sync_logs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      orcamentos_fechados_inseridos: result?.orcamentos_fechados_inseridos ?? 0,
      orcamentos_abertos_inseridos: result?.orcamentos_abertos_inseridos ?? 0,
      pagamentos_inseridos: result?.pagamentos_inseridos ?? 0,
      tratamentos_inseridos: result?.tratamentos_inseridos ?? 0,
      recalculo_ok: status === "success",
      error_message: errorMessage ?? null,
    })
    .eq("id", logId);
}

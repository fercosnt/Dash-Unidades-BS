import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SyncLog = {
  clinica_id: string;
  mes_referencia: string;
  status: string;
  recalculo_ok: boolean | null;
  error_message: string | null;
  created_at: string;
  clinicas_parceiras: { nome: string } | null;
};

/**
 * Banner do admin quando a execução mais recente do sync (por clínica/mês, últimas 48h)
 * falhou ou não recalculou o resumo. Erros de sync ficaram invisíveis por meses em 2026 —
 * este aviso existe para isso não se repetir.
 */
export async function SyncAlertBanner() {
  let problemas: SyncLog[] = [];
  try {
    const desde = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data } = await createSupabaseAdminClient()
      .from("sync_logs")
      .select("clinica_id, mes_referencia, status, recalculo_ok, error_message, created_at, clinicas_parceiras(nome)")
      .gte("created_at", desde)
      .order("created_at", { ascending: false });

    const ultimos = new Map<string, SyncLog>();
    for (const log of (data ?? []) as unknown as SyncLog[]) {
      const chave = `${log.clinica_id}|${log.mes_referencia}`;
      if (!ultimos.has(chave)) ultimos.set(chave, log);
    }
    problemas = [...ultimos.values()].filter(
      (l) => l.status === "error" || (l.status === "success" && l.recalculo_ok === false)
    );
  } catch {
    return null; // não-crítico
  }

  if (problemas.length === 0) return null;

  return (
    <div role="alert" className="mx-6 mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      <strong>Sincronização Clinicorp com problema.</strong>{" "}
      {problemas
        .map((p) => {
          const quem = `${p.clinicas_parceiras?.nome ?? "Clínica"} ${p.mes_referencia.slice(0, 7)}`;
          return p.status === "error" ? `${quem}: ${p.error_message ?? "erro"}` : `${quem}: resumo não recalculado`;
        })
        .join(" · ")}{" "}
      <Link href="/admin/upload" className="underline font-medium">
        Ver sincronização
      </Link>
    </div>
  );
}

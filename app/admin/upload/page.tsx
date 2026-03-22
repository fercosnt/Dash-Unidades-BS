import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SyncStatusPanel } from "@/components/upload/SyncStatusPanel";

export const dynamic = "force-dynamic";

export default async function SincronizacaoPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: clinicas }, { data: logs }] = await Promise.all([
    supabase
      .from("clinicas_parceiras")
      .select("id, nome, clinicorp_subscriber_id")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("sync_logs")
      .select("id, clinica_id, mes_referencia, started_at, finished_at, status, trigger, orcamentos_fechados_inseridos, orcamentos_abertos_inseridos, pagamentos_inseridos, tratamentos_inseridos, recalculo_ok, error_message")
      .order("started_at", { ascending: false })
      .limit(50),
  ]);

  const clinicaNames = new Map(
    (clinicas ?? []).map((c) => [c.id, c.nome])
  );

  const mappedClinicas = (clinicas ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    has_credentials: !!c.clinicorp_subscriber_id,
  }));

  const mappedLogs = (logs ?? []).map((l) => ({
    ...l,
    clinica_nome: clinicaNames.get(l.clinica_id) ?? "—",
  }));

  return (
    <SyncStatusPanel clinicas={mappedClinicas} recentLogs={mappedLogs} />
  );
}

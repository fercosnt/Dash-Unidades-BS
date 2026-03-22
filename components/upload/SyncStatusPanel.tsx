"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SyncLog = {
  id: string;
  clinica_id: string;
  clinica_nome: string;
  mes_referencia: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "error" | "skipped";
  trigger: "cron" | "manual";
  orcamentos_fechados_inseridos: number;
  orcamentos_abertos_inseridos: number;
  pagamentos_inseridos: number;
  tratamentos_inseridos: number;
  recalculo_ok: boolean | null;
  error_message: string | null;
};

type Clinica = {
  id: string;
  nome: string;
  has_credentials: boolean;
};

type Props = {
  clinicas: Clinica[];
  recentLogs: SyncLog[];
};

function formatDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: SyncLog["status"] }) {
  const colors: Record<string, string> = {
    success: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
    running: "bg-blue-100 text-blue-800",
    skipped: "bg-neutral-100 text-neutral-600",
  };
  const labels: Record<string, string> = {
    success: "OK",
    error: "Erro",
    running: "Rodando",
    skipped: "Pulado",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-neutral-100 text-neutral-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export function SyncStatusPanel({ clinicas, recentLogs }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Agrupar último log por clínica
  const latestByClinica = new Map<string, SyncLog>();
  for (const log of recentLogs) {
    if (!latestByClinica.has(log.clinica_id)) {
      latestByClinica.set(log.clinica_id, log);
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const clinicasComCredenciais = clinicas.filter((c) => c.has_credentials);
      let totalInseridos = 0;

      for (const clinica of clinicasComCredenciais) {
        const now = new Date();
        const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const mesAnteriorDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const mesAnterior = `${mesAnteriorDate.getFullYear()}-${String(mesAnteriorDate.getMonth() + 1).padStart(2, "0")}-01`;

        for (const mes of [mesAnterior, mesAtual]) {
          try {
            const syncRes = await fetch("/api/admin/clinicorp/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                clinica_id: clinica.id,
                mes_referencia: mes,
                dry_run: false,
              }),
            });
            if (syncRes.ok) {
              const data = await syncRes.json();
              if (data.result) {
                totalInseridos +=
                  data.result.orcamentos_fechados_inseridos +
                  data.result.pagamentos_inseridos +
                  data.result.tratamentos_inseridos;
              }
            }
          } catch {
            // Continue with next
          }
        }
      }

      setSyncMessage(
        totalInseridos > 0
          ? `Sincronizado: ${totalInseridos} registros novos`
          : "Tudo atualizado, nenhum registro novo"
      );
      router.refresh();
    } catch (err) {
      setSyncMessage(`Erro: ${err instanceof Error ? err.message : "falha na sincronização"}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Sincronização Clinicorp</h2>
          <p className="mt-1 text-sm text-white/80">
            Dados sincronizados automaticamente todos os dias às 3:00 BRT.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={syncing}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {syncing ? "Sincronizando..." : "Sincronizar agora"}
        </button>
      </div>

      {syncMessage && (
        <div className={`rounded-md p-3 text-sm ${syncMessage.startsWith("Erro") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {syncMessage}
        </div>
      )}

      {/* Status por clínica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clinicas.map((clinica) => {
          const lastLog = latestByClinica.get(clinica.id);
          const hasError = lastLog?.status === "error";
          const isStale = lastLog
            ? Date.now() - new Date(lastLog.finished_at ?? lastLog.started_at).getTime() > 48 * 60 * 60 * 1000
            : true;

          return (
            <div
              key={clinica.id}
              className={`rounded-lg border p-4 ${
                hasError
                  ? "border-red-300 bg-red-50"
                  : isStale && clinica.has_credentials
                  ? "border-amber-300 bg-amber-50"
                  : "border-neutral-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-neutral-900">{clinica.nome}</h3>
                {!clinica.has_credentials ? (
                  <span className="text-xs text-neutral-400">Sem credenciais</span>
                ) : lastLog ? (
                  <StatusBadge status={lastLog.status} />
                ) : (
                  <span className="text-xs text-neutral-400">Nunca sincronizado</span>
                )}
              </div>

              {lastLog && (
                <div className="space-y-1 text-xs text-neutral-600">
                  <p>Última sync: {formatDate(lastLog.finished_at ?? lastLog.started_at)}</p>
                  <p>
                    Inseridos: {lastLog.orcamentos_fechados_inseridos} orçamentos,{" "}
                    {lastLog.pagamentos_inseridos} pagamentos,{" "}
                    {lastLog.tratamentos_inseridos} tratamentos
                  </p>
                  {lastLog.error_message && (
                    <p className="text-red-600 mt-1">{lastLog.error_message}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Histórico recente */}
      {recentLogs.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100">
            <h3 className="font-medium text-neutral-900 text-sm">Histórico de sincronizações</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Clínica</th>
                  <th className="px-4 py-2">Mês</th>
                  <th className="px-4 py-2">Trigger</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Registros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="text-neutral-700">
                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(log.finished_at ?? log.started_at)}</td>
                    <td className="px-4 py-2">{log.clinica_nome}</td>
                    <td className="px-4 py-2">{log.mes_referencia?.slice(0, 7)}</td>
                    <td className="px-4 py-2">{log.trigger}</td>
                    <td className="px-4 py-2"><StatusBadge status={log.status} /></td>
                    <td className="px-4 py-2 text-xs">
                      {log.status === "success" ? (
                        <>
                          {log.orcamentos_fechados_inseridos + log.orcamentos_abertos_inseridos} orç,{" "}
                          {log.pagamentos_inseridos} pag, {log.tratamentos_inseridos} trat
                        </>
                      ) : log.error_message ? (
                        <span className="text-red-600">{log.error_message.slice(0, 60)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

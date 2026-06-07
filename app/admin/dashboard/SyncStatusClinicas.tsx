"use client";
import type { SyncStatusItem } from "@/lib/dashboard-queries";

function formatDateTime(iso: string | null): string {
  if (!iso) return "nunca sincronizado";
  const d = iso.slice(0, 10).split("-");
  const t = iso.slice(11, 16);
  return `${d[2]}/${d[1]}/${d[0]} ${t}`;
}

function statusBadge(status: string | null): { label: string; cls: string } {
  if (status === "sucesso" || status === "ok" || status === "concluido")
    return { label: "OK", cls: "bg-green-50 text-green-700" };
  if (status === "erro" || status === "falha")
    return { label: "Erro", cls: "bg-red-50 text-red-700" };
  if (!status) return { label: "—", cls: "bg-neutral-100 text-neutral-500" };
  return { label: status, cls: "bg-amber-50 text-amber-700" };
}

/** Status do sync Clinicorp por clínica (substitui o painel legado de uploads XLSX). */
export function SyncStatusClinicas({ items }: { items: SyncStatusItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-md">
      <div className="border-b border-neutral-100 px-6 py-4">
        <h3 className="text-sm font-bold text-neutral-900">Status de sincronização (Clinicorp)</h3>
      </div>
      {items.length === 0 ? (
        <p className="px-6 py-6 text-center text-sm text-neutral-400">Nenhuma clínica ativa.</p>
      ) : (
        <ul className="divide-y divide-neutral-50">
          {items.map((s) => {
            const badge = statusBadge(s.status);
            return (
              <li key={s.clinicaId} className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-800">{s.clinicaNome}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-neutral-400">
                  <span>Última sync: {formatDateTime(s.ultimaSync)}</span>
                  {s.status && (
                    <span>
                      orç: {s.orcamentosFechados ?? 0} · pag: {s.pagamentos ?? 0}
                    </span>
                  )}
                </div>
                {s.erro && <p className="mt-1 text-xs text-red-600">{s.erro}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

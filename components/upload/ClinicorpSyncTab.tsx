"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClinicaSelect, type ClinicaOption } from "@/components/shared/ClinicaSelect";
import { formatCurrency } from "@/lib/utils/formatting";
import type { ClinicorpSyncPreview, ClinicorpSyncResult } from "@/types/clinicorp.types";

type Props = {
  clinicas: ClinicaOption[];
};

type SyncStatus = "idle" | "previewing" | "preview_ready" | "syncing" | "success" | "error";

export function ClinicorpSyncTab({ clinicas }: Props) {
  const router = useRouter();
  const [clinicaId, setClinicaId] = useState("");
  const [mesReferencia, setMesReferencia] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [preview, setPreview] = useState<ClinicorpSyncPreview | null>(null);
  const [result, setResult] = useState<ClinicorpSyncResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handlePreview() {
    if (!clinicaId || !mesReferencia) return;

    setStatus("previewing");
    setErrorMessage("");
    setPreview(null);

    try {
      const res = await fetch("/api/admin/clinicorp/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinica_id: clinicaId,
          mes_referencia: `${mesReferencia}-01`,
          dry_run: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao buscar preview");

      setPreview(data.preview);
      setStatus("preview_ready");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao buscar dados");
      setStatus("error");
    }
  }

  async function handleSync() {
    if (!clinicaId || !mesReferencia) return;

    setStatus("syncing");
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/clinicorp/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinica_id: clinicaId,
          mes_referencia: `${mesReferencia}-01`,
          dry_run: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao sincronizar");

      setResult(data.result);
      setStatus("success");
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao sincronizar");
      setStatus("error");
    }
  }

  function handleReset() {
    setStatus("idle");
    setPreview(null);
    setResult(null);
    setErrorMessage("");
  }

  const isLoading = status === "previewing" || status === "syncing";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold text-white mb-1">
          Sincronizar via Clinicorp
        </h3>
        <p className="text-sm text-white/70 mb-4">
          Busca orçamentos e pagamentos diretamente da API do Clinicorp, sem
          precisar exportar planilha.
        </p>

        {/* Seletores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-white/90">
              Clínica
            </label>
            <ClinicaSelect
              value={clinicaId}
              onChange={setClinicaId}
              clinicas={clinicas}
              disabled={isLoading}
              className="w-full bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-white/90">
              Mês de referência
            </label>
            <input
              type="month"
              value={mesReferencia}
              onChange={(e) => setMesReferencia(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
            />
          </div>
        </div>

        {/* Botão preview */}
        {(status === "idle" || status === "error") && (
          <button
            type="button"
            onClick={handlePreview}
            disabled={!clinicaId || !mesReferencia}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Buscar dados do Clinicorp
          </button>
        )}

        {/* Loading */}
        {status === "previewing" && (
          <div className="flex items-center gap-2 text-white/80">
            <svg
              className="h-5 w-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Buscando dados do Clinicorp...
          </div>
        )}

        {status === "syncing" && (
          <div className="flex items-center gap-2 text-white/80">
            <svg
              className="h-5 w-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Sincronizando dados...
          </div>
        )}

        {/* Erro */}
        {status === "error" && errorMessage && (
          <div className="mt-3 rounded-md bg-red-500/20 border border-red-500/30 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Preview */}
      {status === "preview_ready" && preview && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
          <h4 className="text-base font-semibold text-white">
            Preview — Dados encontrados
          </h4>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-md bg-white/10 p-3 text-center">
              <div className="text-2xl font-bold text-white">
                {preview.orcamentos_fechados}
              </div>
              <div className="text-xs text-white/70">Orç. Fechados</div>
            </div>
            <div className="rounded-md bg-white/10 p-3 text-center">
              <div className="text-2xl font-bold text-white">
                {preview.orcamentos_abertos}
              </div>
              <div className="text-xs text-white/70">Orç. Abertos</div>
            </div>
            <div className="rounded-md bg-white/10 p-3 text-center">
              <div className="text-2xl font-bold text-white">
                {preview.pagamentos}
              </div>
              <div className="text-xs text-white/70">Pagamentos</div>
            </div>
          </div>

          {/* Tabela de fechados */}
          {preview.detalhes.fechados.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-white/90 mb-2">
                Orçamentos Fechados
              </h5>
              <div className="overflow-x-auto rounded-md border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-white/70">
                    <tr>
                      <th className="px-3 py-2 text-left">Paciente</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                      <th className="px-3 py-2 text-left">Profissional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {preview.detalhes.fechados.map((f, i) => (
                      <tr key={i} className="text-white/90">
                        <td className="px-3 py-2">{f.paciente}</td>
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(f.valor)}
                        </td>
                        <td className="px-3 py-2">{f.profissional}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabela de pagamentos */}
          {preview.detalhes.pagamentos.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-white/90 mb-2">
                Pagamentos
              </h5>
              <div className="overflow-x-auto rounded-md border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-white/70">
                    <tr>
                      <th className="px-3 py-2 text-right">Valor</th>
                      <th className="px-3 py-2 text-left">Forma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {preview.detalhes.pagamentos.map((p, i) => (
                      <tr key={i} className="text-white/90">
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(p.valor)}
                        </td>
                        <td className="px-3 py-2">
                          {p.forma.replace(/_/g, " ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md bg-white/95 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSync}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Confirmar sincronização
            </button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {status === "success" && result && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-3">
          <h4 className="text-base font-semibold text-emerald-300">
            Sincronização concluída
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm text-white/90">
            <div>
              Orç. fechados inseridos:{" "}
              <span className="font-semibold">
                {result.orcamentos_fechados_inseridos}
              </span>
            </div>
            <div>
              Orç. fechados ignorados (já existiam):{" "}
              <span className="font-semibold text-white/60">
                {result.orcamentos_fechados_ignorados}
              </span>
            </div>
            <div>
              Orç. abertos inseridos:{" "}
              <span className="font-semibold">
                {result.orcamentos_abertos_inseridos}
              </span>
            </div>
            <div>
              Orç. abertos ignorados:{" "}
              <span className="font-semibold text-white/60">
                {result.orcamentos_abertos_ignorados}
              </span>
            </div>
            <div>
              Pagamentos inseridos:{" "}
              <span className="font-semibold">
                {result.pagamentos_inseridos}
              </span>
            </div>
            <div>
              Pagamentos ignorados:{" "}
              <span className="font-semibold text-white/60">
                {result.pagamentos_ignorados}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="mt-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Nova sincronização
          </button>
        </div>
      )}
    </div>
  );
}

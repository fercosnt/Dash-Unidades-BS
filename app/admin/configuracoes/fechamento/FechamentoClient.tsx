"use client";

import { useState } from "react";
import Link from "next/link";
import {
  fecharMes,
  reabrirMes,
  fetchFechamentoStatus,
  type FechamentoMesItem,
} from "./actions";
import { splitOrcamentosMes } from "./split-actions";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  initialMeses: FechamentoMesItem[];
};

export function FechamentoClient({ initialMeses }: Props) {
  const [meses, setMeses] = useState(initialMeses);
  const [loading, setLoading] = useState<string | null>(null);
  const [splitLoading, setSplitLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    mes: string;
    mesLabel: string;
    action: "fechar" | "reabrir";
  } | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  async function reload() {
    const updated = await fetchFechamentoStatus();
    setMeses(updated);
  }

  async function handleSplit(mes: string, mesLabel: string) {
    setSplitLoading(mes);
    try {
      const result = await splitOrcamentosMes(mes);
      showToast(
        "success",
        `${mesLabel}: ${result.processados} orcamento(s) desmembrado(s). ${result.matched} vinculados, ${result.unmatched} pendentes.`
      );
      await reload();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao desmembrar");
    } finally {
      setSplitLoading(null);
    }
  }

  async function handleConfirm() {
    if (!confirmModal) return;
    const { mes, mesLabel, action } = confirmModal;
    setConfirmModal(null);
    setLoading(mes);

    try {
      if (action === "fechar") {
        const result = await fecharMes(mes);
        if (result.ok) {
          showToast("success", `${mesLabel} fechado com sucesso. ${result.sucesso} clinica(s) recalculada(s).`);
        } else {
          showToast("error", `Fechado com ${result.falhas.length} erro(s): ${result.falhas.map((f) => f.error).join(", ")}`);
        }
      } else {
        const result = await reabrirMes(mes);
        if (result.ok) {
          showToast("success", `${mesLabel} reaberto com sucesso.`);
        } else {
          showToast("error", "Erro ao reabrir o mes.");
        }
      }

      await reload();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(null);
    }
  }

  function splitStatusBadge(m: FechamentoMesItem) {
    if (m.splitTotal === 0) return <span className="text-xs text-neutral-400">—</span>;
    if (m.splitFeitos === 0) {
      return (
        <span className="text-xs text-neutral-500">
          0/{m.splitTotal}
        </span>
      );
    }
    const allDone = m.splitFeitos === m.splitTotal;
    const hasUnmatched = m.splitUnmatched > 0;
    return (
      <span className={`text-xs font-medium ${allDone && !hasUnmatched ? "text-green-600" : hasUnmatched ? "text-amber-600" : "text-blue-600"}`}>
        {m.splitFeitos}/{m.splitTotal}
        {hasUnmatched && ` (${m.splitUnmatched} pendente${m.splitUnmatched > 1 ? "s" : ""})`}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-heading font-bold text-white">Fechamento de Mes</h1>
        <p className="text-sm text-white/60 mt-1">
          Desmembre tratamentos, revise vinculos e feche meses.
        </p>
      </div>

      {meses.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-neutral-400 shadow-md">
          Nenhum resumo mensal encontrado. Faca upload de planilhas para comecar.
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                  <th className="px-5 py-3 text-left font-medium">Mes</th>
                  <th className="px-5 py-3 text-center font-medium">Clinicas</th>
                  <th className="px-5 py-3 text-right font-medium">Faturamento Total</th>
                  <th className="px-5 py-3 text-center font-medium">Itens Split</th>
                  <th className="px-5 py-3 text-center font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Fechado em</th>
                  <th className="px-5 py-3 text-center font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {meses.map((m) => (
                  <tr key={m.mesReferencia} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-5 py-3 font-medium text-neutral-900">{m.mesLabel}</td>
                    <td className="px-5 py-3 text-center text-neutral-600">{m.clinicasTotal}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium text-neutral-900">
                      {fmt(m.faturamentoTotal)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {splitStatusBadge(m)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {m.fechado ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success-700">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                          Fechado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning-700">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                          Aberto
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-neutral-500 text-xs">
                      {formatDateTime(m.fechadoEm)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {loading === m.mesReferencia || splitLoading === m.mesReferencia ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Processando...
                          </span>
                        ) : (
                          <>
                            {/* Botao Desmembrar — so aparece se tem orcamentos pendentes */}
                            {m.splitTotal > 0 && m.splitFeitos < m.splitTotal && (
                              <button
                                type="button"
                                onClick={() => handleSplit(m.mesReferencia, m.mesLabel)}
                                className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                              >
                                Desmembrar
                              </button>
                            )}
                            {/* Link Revisar — so aparece se tem itens splitados */}
                            {m.splitFeitos > 0 && (
                              <Link
                                href={`/admin/configuracoes/fechamento/revisao?mes=${m.mesReferencia}`}
                                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                              >
                                Revisar
                              </Link>
                            )}
                            {/* Botoes fechar/reabrir */}
                            {m.fechado ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmModal({
                                    mes: m.mesReferencia,
                                    mesLabel: m.mesLabel,
                                    action: "reabrir",
                                  })
                                }
                                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                              >
                                Reabrir
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmModal({
                                    mes: m.mesReferencia,
                                    mesLabel: m.mesLabel,
                                    action: "fechar",
                                  })
                                }
                                className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
                              >
                                Fechar Mes
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de confirmacao */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-heading font-bold text-neutral-900">
              {confirmModal.action === "fechar" ? "Fechar Mes" : "Reabrir Mes"}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              {confirmModal.action === "fechar" ? (
                <>
                  Isso vai <strong>recalcular todos os dados</strong> de{" "}
                  <strong>{confirmModal.mesLabel}</strong> para todas as clinicas e{" "}
                  <strong>bloquear novos uploads</strong> para este mes.
                </>
              ) : (
                <>
                  Reabrir <strong>{confirmModal.mesLabel}</strong> vai permitir novos uploads e
                  alteracoes nos dados deste mes.
                </>
              )}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  confirmModal.action === "fechar"
                    ? "bg-primary-600 hover:bg-primary-700"
                    : "bg-warning-600 hover:bg-warning-700"
                }`}
              >
                {confirmModal.action === "fechar" ? "Fechar Mes" : "Reabrir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-success-700 text-white"
              : "bg-danger-700 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

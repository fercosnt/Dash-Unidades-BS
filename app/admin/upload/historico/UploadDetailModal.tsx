"use client";

import type { BatchDetail } from "../actions";

const TIPO_LABELS: Record<string, string> = {
  orcamentos_fechados: "Orçamentos fechados",
  orcamentos_abertos: "Orçamentos abertos",
  tratamentos_executados: "Tratamentos executados",
};

type Props = {
  detail: BatchDetail;
  onClose: () => void;
  formatMonthRef: (iso: string) => string;
  formatDateTime: (iso: string) => string;
};

export function UploadDetailModal({ detail, onClose, formatMonthRef, formatDateTime }: Props) {
  const { batch, registros, total } = detail;
  const tipo = batch.tipo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-neutral-200 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">
              Detalhe do upload — {batch.clinica_nome} · {formatMonthRef(batch.mes_referencia)}
            </h3>
            <p className="text-sm text-neutral-600 mt-1">
              {TIPO_LABELS[tipo] ?? tipo} · {batch.total_registros} registros · {formatDateTime(batch.uploaded_at)}
              {batch.arquivo_nome && ` · ${batch.arquivo_nome}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1">
          <p className="text-sm text-neutral-500 mb-2">
            Exibindo até 100 de {total} registros.
          </p>
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-neutral-700">Paciente</th>
                  {(tipo === "orcamentos_fechados" || tipo === "orcamentos_abertos") && (
                    <th className="px-3 py-2 text-right font-medium text-neutral-700">Valor</th>
                  )}
                  {tipo === "orcamentos_fechados" && (
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">Data fechamento</th>
                  )}
                  {tipo === "tratamentos_executados" && (
                    <>
                      <th className="px-3 py-2 text-left font-medium text-neutral-700">Procedimento</th>
                      <th className="px-3 py-2 text-right font-medium text-neutral-700">Qtd</th>
                      <th className="px-3 py-2 text-left font-medium text-neutral-700">Data execução</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {registros.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-neutral-900">{r.paciente_nome ?? "—"}</td>
                    {(tipo === "orcamentos_fechados" || tipo === "orcamentos_abertos") && (
                      <td className="px-3 py-2 text-right text-neutral-700">
                        {r.valor_total != null ? `R$ ${Number(r.valor_total).toLocaleString("pt-BR")}` : "—"}
                      </td>
                    )}
                    {tipo === "orcamentos_fechados" && (
                      <td className="px-3 py-2 text-neutral-600">{r.data_fechamento ?? "—"}</td>
                    )}
                    {tipo === "tratamentos_executados" && (
                      <>
                        <td className="px-3 py-2 text-neutral-700">{r.procedimento_nome ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-neutral-700">{r.quantidade ?? "—"}</td>
                        <td className="px-3 py-2 text-neutral-600">{r.data_execucao ?? "—"}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

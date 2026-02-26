"use client";

import { useState } from "react";

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDate(s: string): string {
  if (!s) return "";
  const d = new Date(s + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

type Props = {
  pagamentoId: string;
  valor: number;
  dataPagamento: string;
  onSuccess: () => void;
  onClose: () => void;
};

export function EstornarPagamentoModal({
  pagamentoId,
  valor,
  dataPagamento,
  onSuccess,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/pagamentos/${pagamentoId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao estornar.");
        return;
      }
      onSuccess();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Estornar pagamento</h3>
        <p className="text-slate-600 text-sm mb-4">
          Tem certeza que deseja estornar o pagamento de <strong>{formatCurrency(valor)}</strong> de{" "}
          <strong>{formatDate(dataPagamento)}</strong>? Esta ação não pode ser desfeita.
        </p>
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800 mb-4">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Estornando..." : "Estornar"}
          </button>
        </div>
      </div>
    </div>
  );
}

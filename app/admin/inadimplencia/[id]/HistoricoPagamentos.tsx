"use client";

import { useState, useEffect } from "react";
import { listPagamentosDoOrcamento, type PagamentoRow } from "./actions";
import { EstornarPagamentoModal } from "@/components/pagamentos/EstornarPagamentoModal";

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatForma(forma: string): string {
  const map: Record<string, string> = {
    cartao_credito: "Cartão crédito",
    cartao_debito: "Cartão débito",
    pix: "PIX",
    dinheiro: "Dinheiro",
  };
  return map[forma] ?? forma;
}

function formatDate(s: string): string {
  if (!s) return "—";
  const d = new Date(s + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

export function HistoricoPagamentos({
  orcamentoFechadoId,
  onEstornoSuccess,
  readOnly = false,
}: {
  orcamentoFechadoId: string;
  onEstornoSuccess?: () => void;
  readOnly?: boolean;
}) {
  const [pagamentos, setPagamentos] = useState<PagamentoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [estornarPagamento, setEstornarPagamento] = useState<PagamentoRow | null>(null);

  async function load() {
    setLoading(true);
    const list = await listPagamentosDoOrcamento(orcamentoFechadoId);
    setPagamentos(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [orcamentoFechadoId]);

  async function handleEstornoSuccess() {
    setEstornarPagamento(null);
    await load();
    onEstornoSuccess?.();
  }

  if (loading) {
    return <p className="text-slate-500 text-sm">Carregando pagamentos...</p>;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-slate-900">Histórico de pagamentos</h4>
      {pagamentos.length === 0 ? (
        <p className="text-slate-500 text-sm">Nenhum pagamento registrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-700">Data</th>
                <th className="px-4 py-2 text-right font-medium text-slate-700">Valor</th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">Forma</th>
                <th className="px-4 py-2 text-center font-medium text-slate-700">Parcelas</th>
                {!readOnly && (
                  <th className="px-4 py-2 text-left font-medium text-slate-700">Ação</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {pagamentos.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-slate-700">{formatDate(p.data_pagamento)}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900">
                    {formatCurrency(p.valor)}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{formatForma(p.forma)}</td>
                  <td className="px-4 py-2 text-center text-slate-600">
                    {p.parcelas > 1 ? `${p.parcelas}x` : "—"}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setEstornarPagamento(p)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Estornar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {estornarPagamento && !readOnly && (
        <EstornarPagamentoModal
          pagamentoId={estornarPagamento.id}
          valor={estornarPagamento.valor}
          dataPagamento={estornarPagamento.data_pagamento}
          onSuccess={handleEstornoSuccess}
          onClose={() => setEstornarPagamento(null)}
        />
      )}
    </div>
  );
}

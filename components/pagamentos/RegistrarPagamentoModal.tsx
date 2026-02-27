"use client";

import { useState } from "react";

type Props = {
  orcamentoId: string;
  pacienteNome: string;
  valorTotal: number;
  valorEmAberto: number;
  clinicaId: string;
  onSuccess: () => void;
  onClose: () => void;
};

const FORMAS = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_debito", label: "Cartão débito" },
  { value: "cartao_credito", label: "Cartão crédito" },
] as const;

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function RegistrarPagamentoModal({
  orcamentoId,
  pacienteNome,
  valorTotal,
  valorEmAberto,
  onSuccess,
  onClose,
}: Props) {
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState<string>("pix");
  const [parcelas, setParcelas] = useState(1);
  const [dataPagamento, setDataPagamento] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valorNum = parseFloat(valor.replace(/\D/g, "")) / 100 || 0;
  const isCartaoCredito = forma === "cartao_credito";

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "");
    setValor(v ? (Number(v) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (valorNum <= 0) {
      setError("Informe o valor do pagamento.");
      return;
    }
    if (valorNum > valorEmAberto) {
      setError(`Valor não pode exceder o saldo em aberto (${formatCurrency(valorEmAberto)}).`);
      return;
    }
    const numParcelas = isCartaoCredito ? parcelas : 1;
    if (isCartaoCredito && (numParcelas < 1 || numParcelas > 12)) {
      setError("Parcelas deve ser entre 1 e 12.");
      return;
    }
    const hoje = new Date().toISOString().slice(0, 10);
    if (dataPagamento > hoje) {
      setError("Data do pagamento não pode ser futura.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/pagamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orcamento_fechado_id: orcamentoId,
          valor: valorNum,
          forma,
          parcelas: numParcelas,
          data_pagamento: dataPagamento,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao registrar pagamento.");
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
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Registrar pagamento</h3>
        <div className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-700 mb-4">
          <p><strong>Paciente:</strong> {pacienteNome}</p>
          <p><strong>Valor total:</strong> {formatCurrency(valorTotal)}</p>
          <p className="text-amber-700 font-medium"><strong>Saldo em aberto:</strong> {formatCurrency(valorEmAberto)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Valor do pagamento (R$)</span>
            <input
              type="text"
              inputMode="decimal"
              value={valor}
              onChange={handleValorChange}
              placeholder="0,00"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Forma de pagamento</span>
            <select
              value={forma}
              onChange={(e) => setForma(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              {FORMAS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </label>

          {isCartaoCredito && (
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Número de parcelas (1-12)</span>
              <select
                value={parcelas}
                onChange={(e) => setParcelas(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <option key={n} value={n}>{n}x</option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Data do pagamento</span>
            <input
              type="date"
              value={dataPagamento}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Registrando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

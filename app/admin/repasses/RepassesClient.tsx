"use client";
import { useState } from "react";
import { darBaixaRepasse } from "./actions";
import type { RepassePendente, RepasseItem } from "@/lib/repasse-queries";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatMes(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[Number(mo) - 1]}/${y}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function RepassesClient({
  pendentes: initialPendentes,
  feitos: initialFeitos,
}: {
  pendentes: RepassePendente[];
  feitos: RepasseItem[];
}) {
  const [pendentes, setPendentes] = useState(initialPendentes);
  const [feitos, setFeitos] = useState(initialFeitos);
  const [modalItem, setModalItem] = useState<RepassePendente | null>(null);
  const [dataTransferencia, setDataTransferencia] = useState(todayIso());
  const [valor, setValor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  function abrirModal(item: RepassePendente) {
    setModalItem(item);
    setDataTransferencia(todayIso());
    setValor(String(item.valorCalculado.toFixed(2)));
    setObservacao("");
    setMsg(null);
  }

  async function handleConfirmar() {
    if (!modalItem) return;
    setSaving(true);
    const result = await darBaixaRepasse({
      clinicaId: modalItem.clinicaId,
      mesReferencia: modalItem.mesReferencia,
      valorRepasse: Number(valor.replace(",", ".")),
      dataTransferencia,
      observacao: observacao || undefined,
    });
    setSaving(false);
    if (result.ok) {
      setPendentes((prev) =>
        prev.filter(
          (p) => !(p.clinicaId === modalItem.clinicaId && p.mesReferencia === modalItem.mesReferencia)
        )
      );
      setFeitos((prev) => [
        {
          id: crypto.randomUUID(),
          clinicaId: modalItem.clinicaId,
          clinicaNome: modalItem.clinicaNome,
          mesReferencia: modalItem.mesReferencia,
          valorRepasse: Number(valor.replace(",", ".")),
          dataTransferencia,
          observacao: observacao || null,
          status: "transferido",
        },
        ...prev,
      ]);
      setModalItem(null);
    } else {
      setMsg({ tipo: "erro", texto: result.error ?? "Erro ao registrar." });
    }
  }

  return (
    <div className="space-y-8">
      {/* Pendentes */}
      <div className="rounded-xl bg-white shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h3 className="text-sm font-bold text-neutral-900">Pendentes de transferência</h3>
        </div>
        {pendentes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-center text-neutral-400">Todos os repasses estão em dia.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Clínica</th>
                <th className="px-4 py-3 text-left font-medium">Mês</th>
                <th className="px-4 py-3 text-right font-medium">Valor calculado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pendentes.map((item) => (
                <tr
                  key={`${item.clinicaId}-${item.mesReferencia}`}
                  className="border-b border-neutral-50 hover:bg-neutral-50"
                >
                  <td className="px-4 py-3 text-neutral-800">{item.clinicaNome}</td>
                  <td className="px-4 py-3 text-neutral-600">{formatMes(item.mesReferencia)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatCurrency(item.valorCalculado)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => abrirModal(item)}
                      className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      Dar baixa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Histórico */}
      <div className="rounded-xl bg-white shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h3 className="text-sm font-bold text-neutral-900">Histórico de repasses</h3>
        </div>
        {feitos.length === 0 ? (
          <p className="px-6 py-8 text-sm text-center text-neutral-400">Nenhum repasse registrado ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Clínica</th>
                <th className="px-4 py-3 text-left font-medium">Mês</th>
                <th className="px-4 py-3 text-left font-medium">Data transferência</th>
                <th className="px-4 py-3 text-right font-medium">Valor</th>
                <th className="px-4 py-3 text-left font-medium">Observação</th>
              </tr>
            </thead>
            <tbody>
              {feitos.map((item) => (
                <tr key={item.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-800">{item.clinicaNome}</td>
                  <td className="px-4 py-3 text-neutral-600">{formatMes(item.mesReferencia)}</td>
                  <td className="px-4 py-3 text-neutral-600">{item.dataTransferencia}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatCurrency(item.valorRepasse)}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">{item.observacao ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal dar baixa */}
      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setModalItem(null)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900">Registrar repasse</h3>
            <p className="text-sm text-neutral-600">
              {modalItem.clinicaNome} · {formatMes(modalItem.mesReferencia)}
            </p>
            {msg && (
              <div
                className={`rounded px-3 py-2 text-sm ${
                  msg.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                }`}
              >
                {msg.texto}
              </div>
            )}
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-neutral-700">Data da transferência</span>
                <input
                  type="date"
                  value={dataTransferencia}
                  onChange={(e) => setDataTransferencia(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-neutral-700">Valor transferido (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-neutral-700">Observação (opcional)</span>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm resize-none"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalItem(null)}
                disabled={saving}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmar}
                disabled={saving || !valor || !dataTransferencia}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Confirmar repasse"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

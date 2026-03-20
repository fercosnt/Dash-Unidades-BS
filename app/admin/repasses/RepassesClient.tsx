"use client";
import { useState } from "react";
import { darBaixaRepasse, desfazerRepasse } from "./actions";
import type { RepassePendente, RepasseItem } from "@/lib/repasse-queries";
import type { DebitoItem } from "@/lib/debito-queries";

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
  debitosAtivos,
}: {
  pendentes: RepassePendente[];
  feitos: RepasseItem[];
  debitosAtivos: DebitoItem[];
}) {
  const [pendentes, setPendentes] = useState(initialPendentes);
  const [feitos, setFeitos] = useState(initialFeitos);

  // Modal dar baixa
  const [modalItem, setModalItem] = useState<RepassePendente | null>(null);
  const [dataTransferencia, setDataTransferencia] = useState(todayIso());
  const [valor, setValor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [abatimento, setAbatimento] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Desfazer repasse
  const [confirmDesfazerId, setConfirmDesfazerId] = useState<string | null>(null);
  const [desfazendo, setDesfazendo] = useState(false);

  // Find debito for the current modal's clinic
  const debitoAtivo = modalItem
    ? debitosAtivos.find((d) => d.clinicaId === modalItem.clinicaId) ?? null
    : null;

  function abrirModal(item: RepassePendente) {
    setModalItem(item);
    setDataTransferencia(todayIso());
    setValor(String(item.valorCalculado.toFixed(2)));
    setObservacao("");
    setAbatimento("");
    setMsg(null);
  }

  async function handleConfirmar() {
    if (!modalItem) return;
    setSaving(true);
    const abatimentoNum = Number(abatimento.replace(",", ".")) || 0;
    const result = await darBaixaRepasse({
      clinicaId: modalItem.clinicaId,
      mesReferencia: modalItem.mesReferencia,
      valorRepasse: Number(valor.replace(",", ".")),
      dataTransferencia,
      observacao: observacao || undefined,
      abatimento: abatimentoNum > 0 ? abatimentoNum : undefined,
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

  async function handleDesfazer(id: string) {
    setDesfazendo(true);
    const result = await desfazerRepasse(id);
    setDesfazendo(false);
    setConfirmDesfazerId(null);
    if (result.ok) {
      const item = feitos.find((f) => f.id === id);
      setFeitos((prev) => prev.filter((f) => f.id !== id));
      // Restore to pendentes if we have the calculated value
      if (item) {
        setPendentes((prev) => [
          {
            clinicaId: item.clinicaId,
            clinicaNome: item.clinicaNome,
            mesReferencia: item.mesReferencia,
            valorCalculado: item.valorRepasse,
          },
          ...prev,
        ]);
      }
    } else {
      setMsg({ tipo: "erro", texto: result.error ?? "Erro ao desfazer." });
    }
  }

  const maxAbatimento = debitoAtivo
    ? Math.min(debitoAtivo.saldoRestante, Number(valor.replace(",", ".")) || 0)
    : 0;

  return (
    <div className="space-y-8">
      {msg && (
        <div className={`rounded px-3 py-2 text-sm ${msg.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {msg.texto}
        </div>
      )}

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
                <th className="px-4 py-3" />
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
                  <td className="px-4 py-3 text-right">
                    {confirmDesfazerId === item.id ? (
                      <span className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => handleDesfazer(item.id)}
                          disabled={desfazendo}
                          className="text-xs text-red-600 font-medium hover:underline disabled:opacity-50"
                        >
                          {desfazendo ? "..." : "Confirmar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDesfazerId(null)}
                          className="text-xs text-neutral-500 hover:underline"
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDesfazerId(item.id)}
                        title="Desfazer repasse"
                        className="text-neutral-400 hover:text-red-600 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </td>
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
              <div className={`rounded px-3 py-2 text-sm ${msg.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
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

              {/* Débito ativo */}
              {debitoAtivo && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">
                    Esta clínica tem débito ativo
                  </p>
                  <p className="text-xs text-amber-700">
                    {debitoAtivo.descricao} · Saldo devedor: {formatCurrency(debitoAtivo.saldoRestante)}
                  </p>
                  <label className="block">
                    <span className="text-xs font-medium text-amber-800">
                      Abater do repasse (R$) — máx. {formatCurrency(maxAbatimento)}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={maxAbatimento}
                      value={abatimento}
                      onChange={(e) => setAbatimento(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm"
                      placeholder="0,00"
                    />
                    <p className="mt-1 text-xs text-amber-600">
                      O valor abatido será deduzido do saldo devedor da clínica.
                    </p>
                  </label>
                </div>
              )}

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

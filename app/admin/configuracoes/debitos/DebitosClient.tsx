"use client";
import { useState } from "react";
import { criarDebito, registrarPagamentoDebito } from "./actions";
import { fetchAbatimentosPorDebito } from "@/lib/debito-queries";
import type { DebitoItem, AbatimentoHistoricoItem } from "@/lib/debito-queries";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="mt-2 h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
      <div
        className="h-2 rounded-full bg-primary-600 transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

type Clinica = { id: string; nome: string };

type DebitoLocal = DebitoItem & { _historico?: AbatimentoHistoricoItem[]; _historicoOpen?: boolean };

export function DebitosClient({
  debitos: initialDebitos,
  clinicas,
}: {
  debitos: DebitoItem[];
  clinicas: Clinica[];
}) {
  const [debitos, setDebitos] = useState<DebitoLocal[]>(initialDebitos);
  const [showForm, setShowForm] = useState(false);
  const [clinicaId, setClinicaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Pagamento modal
  const [pagamentoDebitoId, setPagamentoDebitoId] = useState<string | null>(null);
  const [pagamentoValor, setPagamentoValor] = useState("");
  const [pagandoSaving, setPagandoSaving] = useState(false);
  const [pagamentoMsg, setPagamentoMsg] = useState<string | null>(null);

  const debitoModal = pagamentoDebitoId ? debitos.find((d) => d.id === pagamentoDebitoId) : null;

  function abrirPagamento(d: DebitoLocal) {
    setPagamentoDebitoId(d.id);
    setPagamentoValor(d.saldoRestante.toFixed(2));
    setPagamentoMsg(null);
  }

  async function handleCriar() {
    setSaving(true);
    const result = await criarDebito({
      clinicaId,
      descricao,
      valorTotal: Number(valorTotal.replace(",", ".")),
      dataInicio,
    });
    setSaving(false);
    if (result.ok) {
      const clinicaNome = clinicas.find((c) => c.id === clinicaId)?.nome ?? "—";
      const vt = Number(valorTotal.replace(",", "."));
      setDebitos((prev) => [
        {
          id: crypto.randomUUID(),
          clinicaId,
          clinicaNome,
          descricao,
          valorTotal: vt,
          valorPago: 0,
          saldoRestante: vt,
          dataInicio,
          status: "ativo",
        },
        ...prev,
      ]);
      setShowForm(false);
      setClinicaId("");
      setDescricao("");
      setValorTotal("");
      setMsg({ tipo: "ok", texto: "Débito criado com sucesso." });
      setTimeout(() => setMsg(null), 4000);
    } else {
      setMsg({ tipo: "erro", texto: result.error ?? "Erro ao criar." });
    }
  }

  async function handleRegistrarPagamento() {
    if (!pagamentoDebitoId || !pagamentoValor) return;
    const valor = Number(pagamentoValor.replace(",", "."));
    if (valor <= 0) return;

    setPagandoSaving(true);
    const result = await registrarPagamentoDebito(pagamentoDebitoId, valor);
    setPagandoSaving(false);

    if (result.ok) {
      setDebitos((prev) =>
        prev
          .map((d) => {
            if (d.id !== pagamentoDebitoId) return d;
            const novoValorPago = result.novoValorPago ?? d.valorPago + valor;
            return {
              ...d,
              valorPago: novoValorPago,
              saldoRestante: d.valorTotal - novoValorPago,
              status: result.quitado ? "quitado" : "ativo",
            };
          })
          .filter((d) => d.status === "ativo")
      );
      setPagamentoDebitoId(null);
      setMsg({ tipo: "ok", texto: result.quitado ? "Débito quitado!" : "Pagamento registrado." });
      setTimeout(() => setMsg(null), 4000);
    } else {
      setPagamentoMsg(result.error ?? "Erro ao registrar.");
    }
  }

  async function toggleHistorico(debitoId: string) {
    setDebitos((prev) =>
      prev.map((d) => {
        if (d.id !== debitoId) return d;
        return { ...d, _historicoOpen: !d._historicoOpen };
      })
    );

    const debito = debitos.find((d) => d.id === debitoId);
    if (debito && !debito._historico) {
      const historico = await fetchAbatimentosPorDebito(debitoId);
      setDebitos((prev) =>
        prev.map((d) => (d.id === debitoId ? { ...d, _historico: historico } : d))
      );
    }
  }

  const maxPagamento = debitoModal?.saldoRestante ?? 0;

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded px-3 py-2 text-sm ${msg.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {msg.texto}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-neutral-900">Débitos ativos</h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          + Novo débito
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-neutral-800">Novo débito</h4>
          <div className="grid grid-cols-2 gap-3">
            <label className="block col-span-2 sm:col-span-1">
              <span className="text-xs font-medium text-neutral-700">Clínica</span>
              <select
                value={clinicaId}
                onChange={(e) => setClinicaId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {clinicas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </label>
            <label className="block col-span-2 sm:col-span-1">
              <span className="text-xs font-medium text-neutral-700">Data de início</span>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block col-span-2">
              <span className="text-xs font-medium text-neutral-700">Descrição</span>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Franquia Fee — Contrato 2025"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block col-span-2 sm:col-span-1">
              <span className="text-xs font-medium text-neutral-700">Valor total (R$)</span>
              <input
                type="number"
                step="0.01"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCriar}
              disabled={saving || !clinicaId || !descricao || !valorTotal}
              className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Criar débito"}
            </button>
          </div>
        </div>
      )}

      {debitos.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-400">Nenhum débito ativo.</p>
      ) : (
        <div className="space-y-4">
          {debitos.map((d) => {
            const pct = d.valorTotal > 0 ? (d.valorPago / d.valorTotal) * 100 : 0;
            return (
              <div key={d.id} className="rounded-xl bg-white shadow-sm border border-neutral-100 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{d.clinicaNome}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{d.descricao}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => abrirPagamento(d)}
                    className="rounded-md bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                  >
                    Registrar pagamento
                  </button>
                </div>
                <div className="mt-3 flex gap-6 text-xs text-neutral-600">
                  <span>
                    <span className="text-neutral-400">Total:</span>{" "}
                    <span className="font-medium">{formatCurrency(d.valorTotal)}</span>
                  </span>
                  <span>
                    <span className="text-neutral-400">Pago:</span>{" "}
                    <span className="font-medium text-green-700">{formatCurrency(d.valorPago)}</span>
                  </span>
                  <span>
                    <span className="text-neutral-400">Saldo:</span>{" "}
                    <span className="font-medium text-red-700">{formatCurrency(d.saldoRestante)}</span>
                  </span>
                </div>
                <ProgressBar pct={pct} />
                <p className="mt-1 text-right text-xs text-neutral-400">{pct.toFixed(1)}%</p>

                {/* Histórico expansível */}
                <div className="mt-3 border-t border-neutral-100 pt-2">
                  <button
                    type="button"
                    onClick={() => toggleHistorico(d.id)}
                    className="text-xs text-neutral-500 hover:text-primary-600 flex items-center gap-1"
                  >
                    <svg
                      className={`h-3 w-3 transition-transform ${d._historicoOpen ? "rotate-90" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                    {d._historicoOpen ? "Ocultar histórico" : "Ver histórico de abatimentos"}
                  </button>

                  {d._historicoOpen && (
                    <div className="mt-2">
                      {!d._historico ? (
                        <p className="text-xs text-neutral-400 py-2">Carregando...</p>
                      ) : d._historico.length === 0 ? (
                        <p className="text-xs text-neutral-400 py-2">Nenhum pagamento registrado.</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-neutral-500">
                              <th className="py-1 text-left font-medium">Data</th>
                              <th className="py-1 text-right font-medium">Valor</th>
                              <th className="py-1 text-left font-medium">Origem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {d._historico.map((ab) => (
                              <tr key={ab.id} className="border-t border-neutral-50">
                                <td className="py-1 text-neutral-600">
                                  {new Date(ab.createdAt).toLocaleDateString("pt-BR")}
                                </td>
                                <td className="py-1 text-right tabular-nums font-medium text-green-700">
                                  {formatCurrency(ab.valorAbatido)}
                                </td>
                                <td className="py-1 text-neutral-500">{ab.origem}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Registrar Pagamento */}
      {debitoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !pagandoSaving && setPagamentoDebitoId(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900">Registrar pagamento</h3>
            <p className="text-sm text-neutral-600">
              {debitoModal.clinicaNome} · {debitoModal.descricao}
            </p>
            {pagamentoMsg && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{pagamentoMsg}</p>
            )}
            <label className="block">
              <span className="text-xs font-medium text-neutral-700">
                Valor (R$) — Saldo: {formatCurrency(maxPagamento)}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxPagamento}
                value={pagamentoValor}
                onChange={(e) => setPagamentoValor(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
            {Number(pagamentoValor.replace(",", ".")) >= maxPagamento && maxPagamento > 0 && (
              <p className="rounded bg-green-50 px-3 py-2 text-xs text-green-700">
                Este pagamento quitará o débito.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPagamentoDebitoId(null)}
                disabled={pagandoSaving}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRegistrarPagamento}
                disabled={pagandoSaving || !pagamentoValor || Number(pagamentoValor) <= 0}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {pagandoSaving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

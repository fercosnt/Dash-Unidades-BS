"use client";
import { useState } from "react";
import { criarDebito, quitarDebito } from "./actions";
import type { DebitoItem } from "@/lib/debito-queries";

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

export function DebitosClient({
  debitos: initialDebitos,
  clinicas,
}: {
  debitos: DebitoItem[];
  clinicas: Clinica[];
}) {
  const [debitos, setDebitos] = useState(initialDebitos);
  const [showForm, setShowForm] = useState(false);
  const [clinicaId, setClinicaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

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

  async function handleQuitar(id: string) {
    const result = await quitarDebito(id);
    if (result.ok) {
      setDebitos((prev) => prev.filter((d) => d.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`rounded px-3 py-2 text-sm ${
            msg.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
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
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
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
                    onClick={() => handleQuitar(d.id)}
                    className="text-xs text-neutral-400 hover:text-red-600 transition-colors"
                    title="Marcar como quitado"
                  >
                    Quitar
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

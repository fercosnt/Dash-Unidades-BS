"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getConfigVigente, getHistoricoConfig, salvarConfigFinanceira } from "./actions";
import type { ConfigFinanceiraRow } from "./actions";

function formatDate(s: string) {
  if (!s) return "—";
  return new Date(s + "T12:00:00").toLocaleDateString("pt-BR");
}

function formatPercent(value: number) {
  return `${Number(value).toFixed(1)}%`;
}

export function FinanceiroClient({
  vigente: initialVigente,
  historico: initialHistorico,
}: {
  vigente: ConfigFinanceiraRow | null;
  historico: ConfigFinanceiraRow[];
}) {
  const router = useRouter();
  const [vigente, setVigente] = useState<ConfigFinanceiraRow | null>(initialVigente);
  const [historico, setHistorico] = useState<ConfigFinanceiraRow[]>(initialHistorico);
  useEffect(() => {
    setVigente(initialVigente);
    setHistorico(initialHistorico);
  }, [initialVigente, initialHistorico]);

  const [form, setForm] = useState({
    taxa_cartao_percentual: initialVigente?.taxa_cartao_percentual ?? 0,
    imposto_nf_percentual: initialVigente?.imposto_nf_percentual ?? 0,
    percentual_beauty_smile: initialVigente?.percentual_beauty_smile ?? 60,
  });
  useEffect(() => {
    if (initialVigente) {
      setForm({
        taxa_cartao_percentual: initialVigente.taxa_cartao_percentual,
        imposto_nf_percentual: initialVigente.imposto_nf_percentual,
        percentual_beauty_smile: initialVigente.percentual_beauty_smile,
      });
    }
  }, [initialVigente]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const t = Number(form.taxa_cartao_percentual);
      const i = Number(form.imposto_nf_percentual);
      const p = Number(form.percentual_beauty_smile);
      if (isNaN(t) || t < 0) throw new Error("Taxa cartão inválida.");
      if (isNaN(i) || i < 0) throw new Error("Imposto NF inválido.");
      if (isNaN(p) || p < 0 || p > 100) throw new Error("Percentual Beauty Smile deve ser entre 0 e 100.");
      await salvarConfigFinanceira({
        taxa_cartao_percentual: t,
        imposto_nf_percentual: i,
        percentual_beauty_smile: p,
      });
      const [v, h] = await Promise.all([getConfigVigente(), getHistoricoConfig()]);
      setVigente(v);
      setHistorico(h);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-neutral-800">Configurações financeiras</h2>
        <p className="text-neutral-600 text-sm mt-1">Parâmetros vigentes e histórico de alterações.</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6 mb-8">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Parâmetros vigentes</h3>
        {vigente && (
          <p className="text-neutral-500 text-sm mb-4">
            Vigência desde <strong>{formatDate(vigente.vigencia_inicio)}</strong>
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Taxa cartão (%)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.taxa_cartao_percentual}
              onChange={(e) => setForm((f) => ({ ...f, taxa_cartao_percentual: Number(e.target.value) || 0 }))}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Imposto NF (%)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.imposto_nf_percentual}
              onChange={(e) => setForm((f) => ({ ...f, imposto_nf_percentual: Number(e.target.value) || 0 }))}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Percentual Beauty Smile (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={form.percentual_beauty_smile}
              onChange={(e) => setForm((f) => ({ ...f, percentual_beauty_smile: Number(e.target.value) || 0 }))}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar nova configuração"}
          </button>
        </form>
        <p className="text-neutral-500 text-xs mt-3">
          Ao salvar, a configuração anterior será encerrada (vigência até ontem) e esta passará a valer a partir de hoje.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <h3 className="text-lg font-semibold text-neutral-900 p-4 border-b border-neutral-200">Histórico</h3>
        <table className="min-w-full divide-y divide-neutral-200">
          <thead>
            <tr className="bg-neutral-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">Vigência início</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">Vigência fim</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-600">Taxa cartão</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-600">Imposto NF</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-600">% Beauty Smile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {historico.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">Nenhuma configuração registrada.</td>
              </tr>
            ) : (
              historico.map((row) => (
                <tr key={row.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm text-neutral-900">{formatDate(row.vigencia_inicio)}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{formatDate(row.vigencia_fim ?? "")}</td>
                  <td className="px-4 py-3 text-right text-sm text-neutral-600">{formatPercent(row.taxa_cartao_percentual)}</td>
                  <td className="px-4 py-3 text-right text-sm text-neutral-600">{formatPercent(row.imposto_nf_percentual)}</td>
                  <td className="px-4 py-3 text-right text-sm text-neutral-600">{formatPercent(row.percentual_beauty_smile)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

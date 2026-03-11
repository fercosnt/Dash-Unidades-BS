"use client";
import { useState } from "react";
import { darBaixaComissaoDentista, calcularComissaoDentista } from "./actions";
import type { ComissaoDentistaItem, ConfigComissaoDentista } from "@/lib/comissao-dentista-queries";
import type { DentistaItem } from "@/lib/dentista-queries";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const OPTIONS_2026 = MONTHS.map((label, i) => ({
  value: `2026-${String(i + 1).padStart(2, "0")}`,
  label: `${label}/2026`,
}));

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatMes(m: string) {
  const [y, mo] = m.split("-");
  return `${MONTHS[Number(mo) - 1]}/${y}`;
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "pago"
      ? "bg-green-100 text-green-800"
      : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      {status === "pago" ? "Pago" : "Pendente"}
    </span>
  );
}

export function ComissoesDentistaClient({
  comissoes: initialComissoes,
  config,
  dentistas,
}: {
  comissoes: ComissaoDentistaItem[];
  config: ConfigComissaoDentista | null;
  dentistas: DentistaItem[];
}) {
  const [comissoes, setComissoes] = useState(initialComissoes);

  // Calcular comissão
  const defaultMes = OPTIONS_2026.find((o) => o.value === new Date().toISOString().slice(0, 7))?.value ?? OPTIONS_2026[0].value;
  const [calcDentistaId, setCalcDentistaId] = useState(dentistas[0]?.id ?? "");
  const [calcMes, setCalcMes] = useState(defaultMes);
  const [calculating, setCalculating] = useState(false);
  const [calcMsg, setCalcMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Dar baixa
  const [modalId, setModalId] = useState<string | null>(null);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function handleCalcular() {
    if (!calcDentistaId) return;
    setCalculating(true);
    setCalcMsg(null);
    const result = await calcularComissaoDentista(calcDentistaId, calcMes);
    setCalculating(false);
    if (result.ok) {
      const dentista = dentistas.find((d) => d.id === calcDentistaId);
      setCalcMsg({
        tipo: "ok",
        texto: `Tier ${result.tier} — ${formatCurrency(result.valorComissao ?? 0)} calculado para ${dentista?.nome ?? ""} em ${formatMes(calcMes)}.`,
      });
      // Refresh comissoes to show new/updated entry
      // Simple approach: reload page data via re-fetch isn't easily possible here,
      // so just show success and prompt user to refresh if needed
    } else {
      setCalcMsg({ tipo: "erro", texto: result.error ?? "Erro ao calcular." });
    }
    setTimeout(() => setCalcMsg(null), 6000);
  }

  async function handleBaixa() {
    if (!modalId) return;
    setSaving(true);
    const result = await darBaixaComissaoDentista(modalId, dataPagamento, observacao || undefined);
    setSaving(false);
    if (result.ok) {
      setComissoes((prev) =>
        prev.map((c) =>
          c.id === modalId
            ? { ...c, status: "pago", dataPagamento, observacao: observacao || null }
            : c
        )
      );
      setModalId(null);
      setMsg({ tipo: "ok", texto: "Comissão marcada como paga." });
      setTimeout(() => setMsg(null), 4000);
    } else {
      setMsg({ tipo: "erro", texto: result.error ?? "Erro ao registrar." });
    }
  }

  const totalPendente = comissoes
    .filter((c) => c.status === "pendente")
    .reduce((a, c) => a + c.valorComissao, 0);
  const totalPago = comissoes
    .filter((c) => c.status === "pago")
    .reduce((a, c) => a + c.valorComissao, 0);

  return (
    <div className="space-y-6">
      {/* Calcular comissão */}
      <div className="rounded-xl bg-white shadow-md p-6">
        <h3 className="text-sm font-bold text-neutral-900 mb-4">Calcular comissão</h3>
        {dentistas.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nenhuma dentista ativa cadastrada.{" "}
            <a href="/admin/configuracoes/dentistas" className="text-primary-600 hover:underline">
              Cadastrar dentista
            </a>
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-xs font-medium text-neutral-700">Dentista</span>
              <select
                value={calcDentistaId}
                onChange={(e) => setCalcDentistaId(e.target.value)}
                className="mt-1 block rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              >
                {dentistas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome} — {d.clinicaNome}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-neutral-700">Mês</span>
              <select
                value={calcMes}
                onChange={(e) => setCalcMes(e.target.value)}
                className="mt-1 block rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              >
                {OPTIONS_2026.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleCalcular}
              disabled={calculating || !calcDentistaId}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {calculating ? "Calculando..." : "Calcular comissão"}
            </button>
          </div>
        )}
        {calcMsg && (
          <div className={`mt-3 rounded px-3 py-2 text-sm ${calcMsg.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {calcMsg.texto}
          </div>
        )}
      </div>

      {/* Config tiers */}
      {config && (
        <div className="rounded-xl bg-white shadow-sm border border-neutral-100 p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
            Configuração de tiers atual
          </p>
          <div className="flex gap-6 text-sm text-neutral-700">
            <span>Tier 1 (até {config.tier1Limite} vendas): {config.tier1Percentual}%</span>
            <span>Tier 2 (até {config.tier2Limite} vendas): {config.tier2Percentual}%</span>
            <span>Tier 3 (acima): {config.tier3Percentual}%</span>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-white shadow-sm border border-neutral-100 p-4">
          <p className="text-xs text-neutral-500">Total pendente</p>
          <p className="text-xl font-bold text-amber-700 mt-1">{formatCurrency(totalPendente)}</p>
        </div>
        <div className="rounded-xl bg-white shadow-sm border border-neutral-100 p-4">
          <p className="text-xs text-neutral-500">Total pago</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totalPago)}</p>
        </div>
      </div>

      {msg && (
        <div className={`rounded px-3 py-2 text-sm ${msg.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {msg.texto}
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-xl bg-white shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h3 className="text-sm font-bold text-neutral-900">Comissões por mês/clínica</h3>
        </div>
        {comissoes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-center text-neutral-400">
            Nenhuma comissão registrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                  <th className="px-4 py-3 text-left font-medium">Dentista</th>
                  <th className="px-4 py-3 text-left font-medium">Clínica</th>
                  <th className="px-4 py-3 text-left font-medium">Mês</th>
                  <th className="px-4 py-3 text-right font-medium">Vendas</th>
                  <th className="px-4 py-3 text-center font-medium">Tier</th>
                  <th className="px-4 py-3 text-right font-medium">%</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {comissoes.map((c) => (
                  <tr key={c.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-800">{c.dentistaNome ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{c.clinicaNome}</td>
                    <td className="px-4 py-3 text-neutral-600">{formatMes(c.mesReferencia)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.qtdeVendas}</td>
                    <td className="px-4 py-3 text-center text-neutral-600">T{c.tierAplicado}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-600">{c.percentual}%</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(c.valorComissao)}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status === "pendente" && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalId(c.id);
                            setDataPagamento(new Date().toISOString().slice(0, 10));
                            setObservacao("");
                          }}
                          className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                        >
                          Dar baixa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal dar baixa */}
      {modalId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setModalId(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900">Registrar pagamento</h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-neutral-700">Data do pagamento</span>
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
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
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalId(null)}
                disabled={saving}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBaixa}
                disabled={saving || !dataPagamento}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

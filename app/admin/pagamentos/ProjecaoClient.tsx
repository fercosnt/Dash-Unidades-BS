"use client";

import { useState, useMemo } from "react";
import {
  getProjecaoRecebimentos,
  getParcelasDrillDown,
  type ProjecaoRow,
  type ProjecaoFilters,
  type ParcelaDrillRow,
} from "./actions";
import { getClinicasAtivas } from "../upload/actions";

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

function formatMes(mes: string): string {
  const str = String(mes ?? "").trim();
  const match = str.match(/^(\d{4})-(\d{2})/);
  if (!match) return str || "—";
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const d = new Date(year, month, 1);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

export function ProjecaoClient({
  initialList,
  clinicas,
}: {
  initialList: ProjecaoRow[];
  clinicas: { id: string; nome: string }[];
}) {
  const [list, setList] = useState(initialList);
  const [clinicaId, setClinicaId] = useState<string>("");
  const [mesInicio, setMesInicio] = useState<string>("");
  const [mesFim, setMesFim] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [drillRows, setDrillRows] = useState<ParcelaDrillRow[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  async function applyFilters() {
    setLoading(true);
    const filters: ProjecaoFilters = {};
    if (clinicaId) filters.clinica_id = clinicaId;
    if (mesInicio) filters.mes_inicio = mesInicio;
    if (mesFim) filters.mes_fim = mesFim;
    const newList = await getProjecaoRecebimentos(filters);
    setList(newList);
    setLoading(false);
  }

  async function toggleDrill(row: ProjecaoRow) {
    const key = `${row.mes_recebimento}::${row.clinica_id}`;
    if (expandedKey === key) {
      setExpandedKey(null);
      setDrillRows([]);
      return;
    }
    setExpandedKey(key);
    setDrillLoading(true);
    const mes = String(row.mes_recebimento).slice(0, 7);
    const rows = await getParcelasDrillDown(mes, row.clinica_id);
    setDrillRows(rows);
    setDrillLoading(false);
  }

  const totalProjetado = list.reduce((s, r) => s + Number(r.total_projetado), 0);
  const totalParcelas = list.reduce((s, r) => s + Number(r.total_parcelas || 0), 0);
  const mesesUnicos = Array.from(new Set(list.map((r) => r.mes_recebimento))).length;

  // Agregar por mês para o gráfico (até 12 meses, ordenados)
  const chartData = useMemo(() => {
    const byMes: Record<string, number> = {};
    for (const r of list) {
      const mes = String(r.mes_recebimento).slice(0, 7);
      byMes[mes] = (byMes[mes] ?? 0) + Number(r.total_projetado);
    }
    return Object.entries(byMes)
      .map(([mes, valor]) => ({
        mes,
        mesLabel: formatMes(mes + "-01"),
        valor: Math.round(valor * 100) / 100,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(0, 12);
  }, [list]);

  const mediaMensal =
    chartData.length > 0
      ? chartData.reduce((sum, d) => sum + d.valor, 0) / chartData.length
      : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Projeção de recebimentos</h1>
      <p className="mt-0.5 text-sm text-white/80">
        Parcelas de cartão (D+30) projetadas por clínica e mês de recebimento.
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Total projetado (filtro)</p>
          <p className="mt-1 text-xl font-semibold text-neutral-900">
            {formatCurrency(totalProjetado)}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Meses com recebimento</p>
          <p className="mt-1 text-xl font-semibold text-neutral-800">{mesesUnicos}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Qtd. parcelas</p>
          <p className="mt-1 text-xl font-semibold text-neutral-800">{totalParcelas}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Clínica</label>
          <select
            value={clinicaId}
            onChange={(e) => setClinicaId(e.target.value)}
            className="mt-1 block w-48 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {clinicas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Mês início</label>
          <input
            type="month"
            value={mesInicio}
            onChange={(e) => setMesInicio(e.target.value)}
            className="mt-1 block rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Mês fim</label>
          <input
            type="month"
            value={mesFim}
            onChange={(e) => setMesFim(e.target.value)}
            className="mt-1 block rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={applyFilters}
          disabled={loading}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Carregando..." : "Filtrar"}
        </button>
      </div>

      {/* Gráfico por mês (barras verticais + linha de tendência) */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-neutral-800">
            Valor projetado por mês (até 12 meses)
          </h3>
          <p className="mb-3 text-xs text-neutral-600">
            Média mensal projetada:{" "}
            <span className="font-semibold text-neutral-900">
              {formatCurrency(mediaMensal)}
            </span>
          </p>

          {(() => {
            const maxVal = Math.max(...chartData.map((x) => x.valor), 1);
            const CHART_H = 150;

            return (
              <div>
                {/* Chart area */}
                <div className="relative mt-2" style={{ height: CHART_H }}>
                  {/* Bars */}
                  <div className="flex h-full items-end">
                    {chartData.map((d) => {
                      const pct = Math.max(5, (d.valor / maxVal) * 100);
                      return (
                        <div
                          key={d.mes}
                          className="flex h-full flex-1 items-end justify-center"
                          style={{ minWidth: 0 }}
                        >
                          <div className="relative h-full w-8">
                            <div className="absolute inset-0 rounded-sm bg-neutral-100" />
                            <div
                              className="absolute inset-x-0 bottom-0 rounded-t-sm bg-primary-600"
                              style={{ height: `${pct}%` }}
                              title={formatCurrency(d.valor)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* Labels */}
                <div className="mt-3 flex text-xs">
                  {chartData.map((d) => (
                    <div
                      key={d.mes}
                      className="flex flex-1 flex-col items-center gap-0.5"
                      style={{ minWidth: 0 }}
                    >
                      <span className="w-full truncate text-center text-[11px] text-neutral-600">
                        {d.mesLabel}
                      </span>
                      <span className="w-full truncate text-center font-medium text-neutral-800">
                        {formatCurrency(d.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}


      {/* Tabela */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow">
        {list.length === 0 ? (
          <div className="px-4 py-8 text-center text-neutral-500">
            Nenhuma parcela projetada no período. Registre pagamentos em cartão para ver a
            projeção aqui.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-neutral-700">
                  Mês recebimento
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-neutral-700">
                  Clínica
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-neutral-700">
                  Valor projetado
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-neutral-700">
                  Parcelas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {list.map((row, i) => {
                const rowKey = `${row.mes_recebimento}::${row.clinica_id}`;
                const isExpanded = expandedKey === rowKey;
                return (
                  <>
                    <tr
                      key={`${row.mes_recebimento}-${row.clinica_id}-${i}`}
                      onClick={() => toggleDrill(row)}
                      className="cursor-pointer hover:bg-neutral-50 transition-colors"
                    >
                      <td className="px-4 py-2 text-sm text-neutral-800">
                        <span className="mr-1 inline-block w-4 text-neutral-400">
                          {isExpanded ? "▾" : "▸"}
                        </span>
                        {formatMes(String(row.mes_recebimento))}
                      </td>
                      <td className="px-4 py-2 text-sm text-neutral-800">{row.clinica_nome}</td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-neutral-800">
                        {formatCurrency(Number(row.total_projetado))}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-neutral-600">
                        {row.total_parcelas}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`drill-${rowKey}`}>
                        <td colSpan={4} className="bg-neutral-50 px-6 py-3">
                          {drillLoading ? (
                            <p className="text-sm text-neutral-500">Carregando parcelas...</p>
                          ) : drillRows.length === 0 ? (
                            <p className="text-sm text-neutral-500">Nenhuma parcela encontrada.</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-neutral-500 border-b border-neutral-200">
                                  <th className="py-1 text-left font-medium">Paciente</th>
                                  <th className="py-1 text-center font-medium">Parcela</th>
                                  <th className="py-1 text-right font-medium">Valor</th>
                                  <th className="py-1 text-right font-medium">Data pgto.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {drillRows.map((dr) => (
                                  <tr key={dr.id} className="border-b border-neutral-100 last:border-0">
                                    <td className="py-1 text-neutral-800">{dr.paciente_nome}</td>
                                    <td className="py-1 text-center text-neutral-600">
                                      {dr.parcela_numero}/{dr.total_parcelas}
                                    </td>
                                    <td className="py-1 text-right font-medium text-neutral-800">
                                      {formatCurrency(dr.valor_parcela)}
                                    </td>
                                    <td className="py-1 text-right text-neutral-600">
                                      {dr.data_pagamento !== "—"
                                        ? new Date(dr.data_pagamento + "T12:00:00").toLocaleDateString("pt-BR")
                                        : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

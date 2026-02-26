"use client";

import { useState, useMemo } from "react";
import {
  getProjecaoRecebimentos,
  type ProjecaoRow,
  type ProjecaoFilters,
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0A2463]">Projeção de recebimentos</h1>
      <p className="text-slate-600">
        Parcelas de cartão (D+30) projetadas por clínica e mês de recebimento.
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total projetado (filtro)</p>
          <p className="mt-1 text-xl font-semibold text-[#0A2463]">
            {formatCurrency(totalProjetado)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Meses com recebimento</p>
          <p className="mt-1 text-xl font-semibold text-slate-800">{mesesUnicos}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Qtd. parcelas</p>
          <p className="mt-1 text-xl font-semibold text-slate-800">{totalParcelas}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Clínica</label>
          <select
            value={clinicaId}
            onChange={(e) => setClinicaId(e.target.value)}
            className="mt-1 block w-48 rounded-md border border-slate-300 px-3 py-2 text-sm"
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
          <label className="block text-sm font-medium text-slate-700">Mês início</label>
          <input
            type="month"
            value={mesInicio}
            onChange={(e) => setMesInicio(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Mês fim</label>
          <input
            type="month"
            value={mesFim}
            onChange={(e) => setMesFim(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={applyFilters}
          disabled={loading}
          className="rounded-md bg-[#0A2463] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Carregando..." : "Filtrar"}
        </button>
      </div>

      {/* Gráfico por mês (barras em CSS) */}
      {chartData.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">
            Valor projetado por mês (até 12 meses)
          </h3>
          <div className="space-y-2">
            {chartData.map((d) => {
              const maxVal = Math.max(...chartData.map((x) => x.valor), 1);
              const pct = (d.valor / maxVal) * 100;
              return (
                <div key={d.mes} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-slate-600 shrink-0">{d.mesLabel}</span>
                  <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-[#0A2463] rounded min-w-[2px] transition-all"
                      style={{ width: `${pct}%` }}
                      title={formatCurrency(d.valor)}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-800 w-20 text-right">
                    {formatCurrency(d.valor)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
        {list.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500">
            Nenhuma parcela projetada no período. Registre pagamentos em cartão para ver a
            projeção aqui.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">
                  Mês recebimento
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">
                  Clínica
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">
                  Valor projetado
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-slate-700">
                  Parcelas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {list.map((row, i) => (
                <tr key={`${row.mes_recebimento}-${row.clinica_id}-${i}`}>
                  <td className="px-4 py-2 text-sm text-slate-800">
                    {formatMes(String(row.mes_recebimento))}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-800">{row.clinica_nome}</td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-slate-800">
                    {formatCurrency(Number(row.total_projetado))}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-slate-600">
                    {row.total_parcelas}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

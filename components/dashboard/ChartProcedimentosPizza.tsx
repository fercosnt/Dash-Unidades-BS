"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import type { ProcedimentoRankingItem } from "@/types/dashboard.types";
import { formatCurrency } from "@/lib/utils/formatting";

const COLORS = [
  "#00109E",
  "#35BFAD",
  "#6B6D70",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#06B6D4",
];

type Props = {
  data: ProcedimentoRankingItem[];
  className?: string;
};

export function ChartProcedimentosPizza({ data, className = "" }: Props) {
  const [viewMode, setViewMode] = useState<"procedimento" | "categoria">("procedimento");

  // Agrupar por categoria
  const categorias = data.reduce<Record<string, { qtde: number; custoTotal: number }>>((acc, item) => {
    const cat = item.categoria || "Sem categoria";
    if (!acc[cat]) acc[cat] = { qtde: 0, custoTotal: 0 };
    acc[cat].qtde += item.quantidade;
    acc[cat].custoTotal += item.custoTotal;
    return acc;
  }, {});

  const totalQtde = data.reduce((a, r) => a + r.quantidade, 0);
  const categoriaData = Object.entries(categorias)
    .map(([cat, v]) => ({
      procedimentoNome: cat,
      categoria: cat,
      quantidade: v.qtde,
      custoUnitario: 0,
      custoTotal: v.custoTotal,
      percentualQtde: totalQtde > 0 ? (v.qtde / totalQtde) * 100 : 0,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const activeData = viewMode === "categoria" ? categoriaData : data;

  const top = activeData.slice(0, 9);
  const outros = activeData.slice(9);

  const chartData =
    outros.length > 0
      ? [
          ...top,
          {
            procedimentoNome: "Outros",
            categoria: "Outros",
            quantidade: outros.reduce((a, r) => a + r.quantidade, 0),
            custoUnitario: 0,
            custoTotal: outros.reduce((a, r) => a + r.custoTotal, 0),
            percentualQtde: outros.reduce((a, r) => a + r.percentualQtde, 0),
          },
        ]
      : top;

  return (
    <div className={`rounded-xl bg-white p-6 shadow-md ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-heading font-bold text-neutral-900">
          Procedimentos Realizados
        </h3>
        <div className="flex rounded-lg border border-neutral-200 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setViewMode("procedimento")}
            className={`px-3 py-1.5 font-medium transition-colors ${
              viewMode === "procedimento"
                ? "bg-primary-600 text-white"
                : "bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            Procedimento
          </button>
          <button
            type="button"
            onClick={() => setViewMode("categoria")}
            className={`px-3 py-1.5 font-medium transition-colors ${
              viewMode === "categoria"
                ? "bg-primary-600 text-white"
                : "bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            Categoria
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="flex h-64 items-center justify-center text-sm text-neutral-400">
          Nenhum procedimento registrado neste período
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="quantidade"
                  nameKey="procedimentoNome"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  label={({ percentualQtde }: { percentualQtde: number }) =>
                    percentualQtde >= 5 ? `${percentualQtde.toFixed(0)}%` : ""
                  }
                  labelLine={false}
                >
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props) => [
                    `${value} (${(props.payload as ProcedimentoRankingItem).percentualQtde.toFixed(1)}%)`,
                    name,
                  ]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #E8E9E8",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value: string) =>
                    value.length > 20 ? `${value.slice(0, 20)}…` : value
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 text-left font-medium">
                    {viewMode === "categoria" ? "Categoria" : "Procedimento"}
                  </th>
                  {viewMode === "procedimento" && (
                    <th className="py-2 text-left font-medium">Categoria</th>
                  )}
                  <th className="py-2 text-right font-medium">Qtde</th>
                  <th className="py-2 text-right font-medium">Custo Total</th>
                  <th className="py-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {activeData.map((row, idx) => (
                  <tr key={idx} className="border-b border-neutral-100">
                    <td className="py-1.5 pr-2 text-neutral-800">
                      <span
                        className="mr-1.5 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      {row.procedimentoNome}
                    </td>
                    {viewMode === "procedimento" && (
                      <td className="py-1.5 text-neutral-500 text-[10px]">
                        {row.categoria}
                      </td>
                    )}
                    <td className="py-1.5 text-right tabular-nums text-neutral-700">
                      {row.quantidade}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-neutral-700">
                      {formatCurrency(row.custoTotal)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-neutral-500">
                      {row.percentualQtde.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TratamentosEvolucaoData } from "@/types/dashboard.types";

const COLORS = ["#00109E", "#35BFAD", "#F59E0B", "#EF4444", "#8B5CF6"];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

type Mode = "valor" | "qtde";

export function ChartTratamentosEvolucao({ data }: { data: TratamentosEvolucaoData }) {
  const [mode, setMode] = useState<Mode>("valor");

  if (data.top5.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-md">
        <h3 className="text-sm font-heading font-bold text-neutral-900 mb-2">
          Evolução por Tratamento
        </h3>
        <p className="text-sm text-neutral-400">Sem dados para exibir.</p>
      </div>
    );
  }

  const chartData = data.series.map((s) => {
    const point: Record<string, string | number> = { mes: s.mes };
    data.top5.forEach((t) => {
      point[t] = mode === "valor" ? (s.valores[t]?.valor ?? 0) : (s.valores[t]?.qtde ?? 0);
    });
    return point;
  });

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-heading font-bold text-neutral-900">
          Evolução por Tratamento — Top 5
        </h3>
        <div className="flex rounded-lg border border-neutral-200 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setMode("valor")}
            className={`px-3 py-1.5 font-medium transition-colors ${
              mode === "valor" ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-50"
            }`}
          >
            Valor
          </button>
          <button
            type="button"
            onClick={() => setMode("qtde")}
            className={`px-3 py-1.5 font-medium transition-colors ${
              mode === "qtde" ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-50"
            }`}
          >
            Quantidade
          </button>
        </div>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E9E8" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: "#6B6D70" }}
              tickLine={false}
              axisLine={{ stroke: "#E8E9E8" }}
            />
            <YAxis
              tickFormatter={(v) =>
                mode === "valor"
                  ? v >= 1000
                    ? `${(v / 1000).toFixed(0)}k`
                    : String(v)
                  : String(v)
              }
              tick={{ fontSize: 11, fill: "#6B6D70" }}
              tickLine={false}
              axisLine={{ stroke: "#E8E9E8" }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                mode === "valor" ? formatCurrency(value) : value,
                name,
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #E8E9E8",
                boxShadow: "0 4px 6px -1px rgba(45,46,48,0.1)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {data.top5.map((t, i) => (
              <Line
                key={t}
                type="monotone"
                dataKey={t}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChartLiquidoAdminPoint } from "@/types/dashboard.types";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatMonth(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

type ChartEvolucaoLiquidoProps = {
  data: ChartLiquidoAdminPoint[];
  className?: string;
};

export function ChartEvolucaoLiquido({ data, className = "" }: ChartEvolucaoLiquidoProps) {
  const chartData = data.map((d) => ({
    ...d,
    mesLabel: formatMonth(d.mesReferencia),
  }));

  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-900 mb-4">
        Evolução do valor líquido (últimos 12 meses)
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="mesLabel"
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Valor líquido"]}
              labelFormatter={(_, payload) => (payload?.[0]?.payload?.mesLabel as string) ?? ""}
              contentStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="valorLiquido"
              name="Valor líquido"
              stroke="#0A2463"
              strokeWidth={2}
              dot={{ fill: "#0A2463", r: 3 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

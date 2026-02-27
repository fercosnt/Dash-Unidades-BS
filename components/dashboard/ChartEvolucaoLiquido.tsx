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
    <div className={`rounded-lg bg-white p-6 shadow-md ${className}`}>
      <h3 className="text-sm font-heading font-bold text-neutral-900 mb-4">
        Evolução do valor líquido (últimos 12 meses)
      </h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E9E8" />
            <XAxis
              dataKey="mesLabel"
              tick={{ fontSize: 11, fill: "#6B6D70" }}
              tickLine={false}
              axisLine={{ stroke: "#E8E9E8" }}
              interval={0}
            />
            <YAxis
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              tick={{ fontSize: 11, fill: "#6B6D70" }}
              tickLine={false}
              axisLine={{ stroke: "#E8E9E8" }}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "Valor líquido"]}
              labelFormatter={(_, payload) => (payload?.[0]?.payload?.mesLabel as string) ?? ""}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E8E9E8", boxShadow: "0 4px 6px -1px rgba(45,46,48,0.1)" }}
            />
            <Line
              type="monotone"
              dataKey="valorLiquido"
              name="Valor líquido"
              stroke="#BB965B"
              strokeWidth={2.5}
              dot={{ fill: "#BB965B", r: 3, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 5, fill: "#BB965B", stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

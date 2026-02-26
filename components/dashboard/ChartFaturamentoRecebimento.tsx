"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ChartDataAdminPoint } from "@/types/dashboard.types";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatMonth(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

type ChartFaturamentoRecebimentoProps = {
  data: ChartDataAdminPoint[];
  className?: string;
};

export function ChartFaturamentoRecebimento({ data, className = "" }: ChartFaturamentoRecebimentoProps) {
  const chartData = data.map((d) => ({
    ...d,
    mesLabel: formatMonth(d.mesReferencia),
  }));

  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-900 mb-4">
        Faturamento bruto vs total recebido (últimos 12 meses)
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
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
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
              labelFormatter={(_, payload) => (payload?.[0]?.payload?.mesLabel as string) ?? ""}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="faturamentoBruto" name="Faturamento bruto" fill="#0A2463" radius={[4, 4, 0, 0]} />
            <Bar dataKey="totalRecebidoMes" name="Total recebido" fill="#059669" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

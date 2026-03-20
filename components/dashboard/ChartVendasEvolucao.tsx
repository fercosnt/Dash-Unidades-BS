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
import type { ChartVendasPoint } from "@/types/dashboard.types";
import { formatCurrency } from "@/lib/utils/formatting";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatMonth(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]}/${y!.slice(2)}`;
}

type Props = {
  data: ChartVendasPoint[];
  className?: string;
};

export function ChartVendasEvolucao({ data, className = "" }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    mesLabel: formatMonth(d.mesReferencia),
  }));

  return (
    <div className={`rounded-xl bg-white p-6 shadow-md ${className}`}>
      <h3 className="text-sm font-heading font-bold text-neutral-900 mb-4">
        Evolução de Vendas — Últimos 3 meses
      </h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E9E8" />
            <XAxis
              dataKey="mesLabel"
              tick={{ fontSize: 12, fill: "#6B6D70" }}
              tickLine={false}
              axisLine={{ stroke: "#E8E9E8" }}
            />
            <YAxis
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              tick={{ fontSize: 11, fill: "#6B6D70" }}
              tickLine={false}
              axisLine={{ stroke: "#E8E9E8" }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "Fechados (R$)" || name === "Abertos (R$)") {
                  return [formatCurrency(value), name];
                }
                return [value, name];
              }}
              labelFormatter={(_, payload) => (payload?.[0]?.payload?.mesLabel as string) ?? ""}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #E8E9E8",
                boxShadow: "0 4px 6px -1px rgba(45,46,48,0.1)",
              }}
              cursor={{ fill: "#E5E7EB", opacity: 0.5 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="fechadosValor" name="Fechados (R$)" fill="#00109E" radius={[4, 4, 0, 0]} />
            <Bar dataKey="abertosValor" name="Abertos (R$)" fill="#35BFAD" radius={[4, 4, 0, 0]} />
            <Bar dataKey="fechadosQtde" name="Qtde fechados" fill="#6B6D70" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

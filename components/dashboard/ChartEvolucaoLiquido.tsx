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
import { CHART_MARGIN_LEFT, CHART_MARGIN_BOTTOM, CHART_MARGIN_RIGHT, CHART_X_PADDING_LEFT, CHART_X_PADDING_RIGHT_LINE, CHART_Y_AXIS_WIDTH } from "./chartConstants";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatMonth(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

/** Corta meses vazios à esquerda; mantém a partir do primeiro mês com valor líquido. */
function trimEmptyMonths(data: ChartLiquidoAdminPoint[]): ChartLiquidoAdminPoint[] {
  const firstWithData = data.findIndex((d) => (d.valorLiquido ?? 0) > 0);
  if (firstWithData === -1) return data;
  return data.slice(firstWithData);
}

type ChartEvolucaoLiquidoProps = {
  data: ChartLiquidoAdminPoint[];
  className?: string;
};

export function ChartEvolucaoLiquido({ data, className = "" }: ChartEvolucaoLiquidoProps) {
  const trimmed = trimEmptyMonths(data);
  const chartData = trimmed.map((d) => ({
    ...d,
    mesLabel: formatMonth(d.mesReferencia),
  }));

  const valores = chartData.map((d) => Number(d.valorLiquido ?? 0));
  const dataMin = valores.length ? Math.min(...valores) : 0;
  const dataMax = valores.length ? Math.max(...valores) : 0;
  const padding = dataMax - dataMin > 0 ? (dataMax - dataMin) * 0.1 : dataMax * 0.1 || 1000;
  const domainMin = Math.min(dataMin - padding, 0);
  const domainMax = dataMax + padding;

  return (
    <div className={`rounded-lg bg-white p-6 shadow-md w-full min-w-0 ${className}`}>
      <h3 className="text-sm font-heading font-bold text-neutral-900 mb-4">
        Evolução do valor líquido
      </h3>
      <div className="relative h-72 w-full min-w-0" style={{ width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: CHART_MARGIN_RIGHT, left: CHART_MARGIN_LEFT, bottom: CHART_MARGIN_BOTTOM }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E9E8" />
            <XAxis
              dataKey="mesLabel"
              tick={{ fontSize: 11, fill: "#6B6D70" }}
              tickLine={false}
              axisLine={{ stroke: "#E8E9E8" }}
              interval={0}
              padding={{ left: CHART_X_PADDING_LEFT, right: CHART_X_PADDING_RIGHT_LINE }}
            />
            <YAxis
              width={CHART_Y_AXIS_WIDTH}
              domain={[domainMin, domainMax]}
              tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
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

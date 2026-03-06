"use client";

import type { ChartParceiroPoint } from "@/types/dashboard.types";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function formatMonth(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`;
}

/** Corta meses vazios à esquerda; mantém a partir do primeiro mês com dado. */
function trimEmptyMonths(data: ChartParceiroPoint[]): ChartParceiroPoint[] {
  const firstWithData = data.findIndex(
    (d) => (d.faturamentoBruto ?? 0) > 0 || (d.valorClinica ?? 0) > 0
  );
  if (firstWithData === -1) return data;
  return data.slice(firstWithData);
}

type ChartParceiroProps = {
  data: ChartParceiroPoint[];
  className?: string;
};

export function ChartParceiro({ data, className = "" }: ChartParceiroProps) {
  const trimmed = trimEmptyMonths(data);
  const maxVal = Math.max(
    1,
    ...trimmed.map((d) => Math.max(d.faturamentoBruto, d.valorClinica))
  );

  return (
    <div className={`rounded-lg bg-white p-6 shadow-md ${className}`}>
      <h3 className="text-sm font-heading font-bold text-neutral-900 mb-4">Últimos 6 meses</h3>
      <div className="space-y-4">
        {trimmed.map((point) => (
          <div key={point.mesReferencia} className="flex items-center gap-3">
            <span className="w-14 text-xs font-medium text-neutral-500 shrink-0">
              {formatMonth(point.mesReferencia)}
            </span>
            <div className="flex-1 flex items-center gap-4 min-w-0">
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-6 rounded-sm bg-primary-100 overflow-hidden">
                  <div
                    className="h-full rounded-sm bg-primary-600 transition-all"
                    style={{ width: `${(point.faturamentoBruto / maxVal) * 100}%` }}
                  />
                </div>
                <div className="h-6 rounded-sm bg-accent/15 overflow-hidden">
                  <div
                    className="h-full rounded-sm bg-accent transition-all"
                    style={{ width: `${(point.valorClinica / maxVal) * 100}%` }}
                  />
                </div>
              </div>
              <div className="w-28 h-12 flex flex-col justify-center items-end text-xs font-semibold text-neutral-900">
                <div>{formatCurrency(point.faturamentoBruto)}</div>
                <div className="text-neutral-600">{formatCurrency(point.valorClinica)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-4 pt-3 border-t border-neutral-100 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-primary-600" /> Faturamento
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-accent" /> Parte clínica (40%)
        </span>
      </div>
    </div>
  );
}

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

type ChartParceiroProps = {
  data: ChartParceiroPoint[];
  className?: string;
};

export function ChartParceiro({ data, className = "" }: ChartParceiroProps) {
  const maxVal = Math.max(
    1,
    ...data.map((d) => Math.max(d.faturamentoBruto, d.valorClinica))
  );

  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Últimos 6 meses</h3>
      <div className="space-y-3">
        {data.map((point) => (
          <div key={point.mesReferencia} className="flex items-center gap-3">
            <span className="w-14 text-xs font-medium text-slate-600 shrink-0">
              {formatMonth(point.mesReferencia)}
            </span>
            <div className="flex-1 flex gap-2 items-center min-w-0 h-7">
              <div
                className="h-full bg-[#0A2463] rounded flex items-center justify-end pr-1.5 min-w-0"
                style={{ width: `${(point.faturamentoBruto / maxVal) * 50}%` }}
              >
                {point.faturamentoBruto > 0 && (
                  <span className="text-[10px] font-medium text-white truncate">
                    {formatCurrency(point.faturamentoBruto)}
                  </span>
                )}
              </div>
              <div
                className="h-full bg-green-600 rounded flex items-center justify-end pr-1.5 min-w-0"
                style={{ width: `${(point.valorClinica / maxVal) * 50}%` }}
              >
                {point.valorClinica > 0 && (
                  <span className="text-[10px] font-medium text-white truncate">
                    {formatCurrency(point.valorClinica)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#0A2463]" /> Faturamento
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-600" /> Parte clínica (40%)
        </span>
      </div>
    </div>
  );
}

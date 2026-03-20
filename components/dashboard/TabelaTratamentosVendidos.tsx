"use client";

import { useState, useMemo } from "react";
import type { TratamentoVendidoItem } from "@/types/dashboard.types";
import { formatCurrency } from "@/lib/utils/formatting";

function PercentBadge({ pct }: { pct: number }) {
  const cls =
    pct >= 20
      ? "bg-green-100 text-green-800"
      : pct >= 10
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${cls}`}>
      {pct.toFixed(1)}%
    </span>
  );
}

function CategoriaBadge({ categoria }: { categoria: string | null }) {
  if (!categoria) return <span className="text-neutral-300">—</span>;
  return (
    <span className="inline-flex rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
      {categoria}
    </span>
  );
}

export function TabelaTratamentosVendidos({ data }: { data: TratamentoVendidoItem[] }) {
  const [categoriaFilter, setCategoriaFilter] = useState("");

  const categorias = useMemo(() => {
    const cats = new Set(data.map((d) => d.categoria).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!categoriaFilter) return data;
    return data.filter((d) => d.categoria === categoriaFilter);
  }, [data, categoriaFilter]);

  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-white shadow-md p-8 text-center text-neutral-400 text-sm">
        Sem dados de tratamentos vendidos para este periodo.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-heading font-bold text-neutral-900">Tratamentos Vendidos</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Agrupado por tratamento — ordenado por valor total decrescente
          </p>
        </div>
        {categorias.length > 0 && (
          <select
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700"
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-xs text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">Tratamento</th>
              <th className="px-4 py-3 text-left font-medium">Categoria</th>
              <th className="px-4 py-3 text-right font-medium">Qtde</th>
              <th className="px-4 py-3 text-right font-medium">Valor Total</th>
              <th className="px-4 py-3 text-right font-medium">Ticket Medio</th>
              <th className="px-4 py-3 text-center font-medium">% Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.tratamentoNome} className="border-b border-neutral-50 hover:bg-neutral-50">
                <td className="px-4 py-3 text-neutral-800 font-medium max-w-xs truncate">
                  {item.tratamentoNome}
                </td>
                <td className="px-4 py-3">
                  <CategoriaBadge categoria={item.categoria} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-600">
                  {item.quantidade}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-neutral-900">
                  {formatCurrency(item.valorTotal)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-500">
                  {item.quantidade > 0
                    ? formatCurrency(item.valorTotal / item.quantidade)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <PercentBadge pct={item.percentualFaturamento} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

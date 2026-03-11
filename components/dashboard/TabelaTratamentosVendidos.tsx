"use client";
import type { TratamentoVendidoItem } from "@/types/dashboard.types";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

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

export function TabelaTratamentosVendidos({ data }: { data: TratamentoVendidoItem[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-white shadow-md p-8 text-center text-neutral-400 text-sm">
        Sem dados de tratamentos vendidos para este período.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100">
        <h3 className="text-sm font-heading font-bold text-neutral-900">Tratamentos Vendidos</h3>
        <p className="text-xs text-neutral-400 mt-0.5">
          Agrupado por tratamento — ordenado por valor total decrescente
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-xs text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">Tratamento</th>
              <th className="px-4 py-3 text-right font-medium">Qtde</th>
              <th className="px-4 py-3 text-right font-medium">Valor Total</th>
              <th className="px-4 py-3 text-right font-medium">Ticket Médio</th>
              <th className="px-4 py-3 text-center font-medium">% Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.tratamentoNome} className="border-b border-neutral-50 hover:bg-neutral-50">
                <td className="px-4 py-3 text-neutral-800 font-medium max-w-xs truncate">
                  {item.tratamentoNome}
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

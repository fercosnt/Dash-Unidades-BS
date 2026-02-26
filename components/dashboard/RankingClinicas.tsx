"use client";

import Link from "next/link";
import type { RankingClinica } from "@/types/dashboard.types";

type RankingClinicasProps = {
  items: RankingClinica[];
  className?: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function RankingClinicas({ items, className = "" }: RankingClinicasProps) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white overflow-hidden ${className}`}>
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">Ranking por faturamento</h3>
        <p className="text-xs text-slate-500 mt-0.5">Resumo calculado para o mês selecionado</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Clínica</th>
              <th className="px-4 py-2 text-right font-medium text-slate-700">Faturamento</th>
              <th className="px-4 py-2 text-right font-medium text-slate-700">Valor líquido</th>
              <th className="px-4 py-2 text-right font-medium text-slate-700">Parte BS 60%</th>
              <th className="px-4 py-2 text-right font-medium text-slate-700">Parte clínica 40%</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Nenhum resumo calculado para este mês.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.clinicaId}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/clinicas/${row.clinicaId}`}
                      className="font-medium text-[#0A2463] hover:underline"
                    >
                      {row.clinicaNome}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-700">{formatCurrency(row.faturamentoBruto)}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{formatCurrency(row.valorLiquido)}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{formatCurrency(row.valorBeautySmile)}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{formatCurrency(row.valorClinica)}</td>
                  <td className="px-4 py-2">
                    <span className={row.ativo ? "text-green-600" : "text-slate-400"}>
                      {row.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

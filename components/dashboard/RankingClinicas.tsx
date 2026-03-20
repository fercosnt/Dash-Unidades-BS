"use client";

import Link from "next/link";
import type { RankingClinica } from "@/types/dashboard.types";
import { formatCurrency } from "@/lib/utils/formatting";

type RankingClinicasProps = {
  items: RankingClinica[];
  className?: string;
};

export function RankingClinicas({ items, className = "" }: RankingClinicasProps) {
  return (
    <div className={`rounded-lg bg-white shadow-md overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-neutral-100">
        <h3 className="text-sm font-heading font-bold text-neutral-900">Ranking por faturamento</h3>
        <p className="text-xs text-neutral-400 mt-0.5">Resumo calculado para o mês selecionado</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-100 text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Clínica</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Faturamento</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">V. líquido</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">BS 60%</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Clínica 40%</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-neutral-400">
                  Nenhum resumo calculado para este mês.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.clinicaId} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-3">
                    <Link
                      href={`/admin/clinicas/${row.clinicaId}`}
                      className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      {row.clinicaNome}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-right text-neutral-700 font-medium">{formatCurrency(row.faturamentoBruto)}</td>
                  <td className="px-6 py-3 text-right text-neutral-700">{formatCurrency(row.valorLiquido)}</td>
                  <td className="px-6 py-3 text-right text-neutral-700">{formatCurrency(row.valorBeautySmile)}</td>
                  <td className="px-6 py-3 text-right text-neutral-700">{formatCurrency(row.valorClinica)}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.ativo
                          ? "bg-success/10 text-success-700"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
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

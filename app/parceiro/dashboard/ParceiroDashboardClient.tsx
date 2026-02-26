"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PeriodoSelector } from "@/components/dashboard/PeriodoSelector";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ChartParceiro } from "@/components/dashboard/ChartParceiro";
import { fetchKpisParceiro, fetchChartParceiro } from "@/lib/dashboard-queries";
import type { KpisParceiro, ChartParceiroPoint } from "@/types/dashboard.types";

type ParceiroDashboardClientProps = {
  initialMes: string;
  initialKpis: KpisParceiro;
  initialChart: ChartParceiroPoint[];
};

export function ParceiroDashboardClient({
  initialMes,
  initialKpis,
  initialChart,
}: ParceiroDashboardClientProps) {
  const [mes, setMes] = useState(initialMes);
  const [kpis, setKpis] = useState(initialKpis);
  const [chartData, setChartData] = useState(initialChart);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mes === initialMes) return;
    setLoading(true);
    Promise.all([fetchKpisParceiro(mes), fetchChartParceiro(6)]).then(([k, c]) => {
      setKpis(k);
      setChartData(c);
      setLoading(false);
    });
  }, [mes, initialMes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-[#0A2463]">Sua visão</h2>
        <PeriodoSelector selectedPeriodo={mes} onChange={setMes} />
      </div>

      {!kpis.resumoDisponivel && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Resumo não disponível para este período. Quando o resumo mensal for calculado, os valores aparecerão aqui.
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Faturamento bruto do mês" value={kpis.faturamentoBruto} format="currency" />
            <KpiCard label="Valor líquido" value={kpis.valorLiquido} format="currency" />
            <KpiCard
              label="Parte da clínica (40%)"
              value={kpis.valorClinica}
              format="currency"
            />
            <KpiCard label="Total inadimplente" value={kpis.totalInadimplente} format="currency" />
          </div>

          <ChartParceiro data={chartData} />

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Acesso rápido</h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/parceiro/orcamentos"
                className="inline-flex items-center rounded-md bg-[#0A2463] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Orçamentos
              </Link>
              <Link
                href="/parceiro/inadimplencia"
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Inadimplência
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
    if (mes === initialMes && mes !== "all") return;
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
        <h2 className="text-xl font-semibold text-white">Sua visão</h2>
        <PeriodoSelector selectedPeriodo={mes} onChange={setMes} />
      </div>

      {!kpis.resumoDisponivel && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Resumo não disponível para este período. Quando o resumo mensal for calculado, os valores aparecerão aqui.
        </div>
      )}

      {loading ? (
        <div className="flex h-40 w-full items-center justify-center text-sm text-neutral-800">
          Carregando...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Faturamento bruto do mês"
              value={kpis.faturamentoBruto}
              format="currency"
              icon="money"
              accentColor="primary"
            />
            <KpiCard
              label="Valor líquido"
              value={kpis.valorLiquido}
              format="currency"
              icon="chart"
              accentColor="primary"
            />
            <KpiCard
              label="Parte da clínica (40%)"
              value={kpis.valorClinica}
              format="currency"
              icon="percent"
              accentColor="primary"
            />
            <KpiCard
              label="Total inadimplente"
              value={kpis.totalInadimplente}
              format="currency"
              icon="alert"
              accentColor="danger"
            />
          </div>

          <ChartParceiro data={chartData} />

          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Acesso rápido</h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/parceiro/orcamentos"
                className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Orçamentos
              </Link>
              <Link
                href="/parceiro/inadimplencia"
                className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
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

import { fetchKpisParceiro, fetchChartParceiro } from "@/lib/dashboard-queries";
import { ParceiroDashboardClient } from "./ParceiroDashboardClient";
import { SaldoCard } from "./SaldoCard";

export default async function ParceiroDashboardPage() {
  const mes = "all";
  const [kpis, chartData] = await Promise.all([
    fetchKpisParceiro(mes),
    fetchChartParceiro(6),
  ]);

  return (
    <div className="space-y-6">
      <SaldoCard />
      <ParceiroDashboardClient
        initialMes={mes}
        initialKpis={kpis}
        initialChart={chartData}
      />
    </div>
  );
}

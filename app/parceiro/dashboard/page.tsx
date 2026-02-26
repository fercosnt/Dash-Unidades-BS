import { fetchKpisParceiro, fetchChartParceiro } from "@/lib/dashboard-queries";
import { ParceiroDashboardClient } from "./ParceiroDashboardClient";

function getDefaultMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ParceiroDashboardPage() {
  const mes = getDefaultMes();
  const [kpis, chartData] = await Promise.all([
    fetchKpisParceiro(mes),
    fetchChartParceiro(6),
  ]);

  return (
    <ParceiroDashboardClient
      initialMes={mes}
      initialKpis={kpis}
      initialChart={chartData}
    />
  );
}

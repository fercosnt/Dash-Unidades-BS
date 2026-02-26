import { fetchKpisAdmin, fetchRankingClinicas, fetchStatusUploads, fetchChartDataAdmin, fetchChartLiquidoAdmin } from "@/lib/dashboard-queries";
import { getClinicasAtivas } from "../upload/actions";
import { DashboardClient } from "./DashboardClient";

function getDefaultMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminDashboardPage() {
  const mes = getDefaultMes();
  const [kpis, ranking, status, chartData, chartLiquido, clinicas] = await Promise.all([
    fetchKpisAdmin(mes),
    fetchRankingClinicas(mes),
    fetchStatusUploads(mes),
    fetchChartDataAdmin(mes, 12),
    fetchChartLiquidoAdmin(mes, 12),
    getClinicasAtivas(),
  ]);

  return (
    <DashboardClient
      initialMes={mes}
      initialKpis={kpis}
      initialRanking={ranking}
      initialStatus={status}
      initialChartData={chartData}
      initialChartLiquido={chartLiquido}
      clinicas={clinicas}
    />
  );
}

import {
  fetchKpisAdminV2,
  fetchDreAdmin,
  fetchRepasseAdmin,
  fetchRankingClinicas,
  fetchStatusUploads,
  fetchChartDataAdmin,
  fetchChartLiquidoAdmin,
  fetchOrcamentosFechados,
  fetchOrcamentosAbertos,
  fetchVendasEvolucao,
  fetchProcedimentosRanking,
  fetchTratamentosVendidos,
} from "@/lib/dashboard-queries";
import { getClinicasAtivas } from "../upload/actions";
import { DashboardClient } from "./DashboardClient";

function getDefaultMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; clinicaId?: string }>;
}) {
  const params = await searchParams;
  const mes = params.mes ?? getDefaultMes();
  const clinicaId = params.clinicaId ?? "";

  const [
    kpis,
    dre,
    repasse,
    ranking,
    status,
    chartData,
    chartLiquido,
    orcamentosFechados,
    orcamentosAbertos,
    evolucao,
    procedimentos,
    tratamentosVendidos,
    clinicas,
  ] = await Promise.all([
    fetchKpisAdminV2(mes, clinicaId || undefined),
    fetchDreAdmin(mes, clinicaId || undefined),
    fetchRepasseAdmin(mes, clinicaId || undefined),
    fetchRankingClinicas(mes, clinicaId || undefined),
    fetchStatusUploads(mes, clinicaId || undefined),
    fetchChartDataAdmin(mes, 12, clinicaId || undefined),
    fetchChartLiquidoAdmin(mes, 12, clinicaId || undefined),
    fetchOrcamentosFechados(mes, clinicaId || undefined),
    fetchOrcamentosAbertos(mes, clinicaId || undefined),
    fetchVendasEvolucao(mes, 3, clinicaId || undefined),
    fetchProcedimentosRanking(mes, clinicaId || undefined),
    fetchTratamentosVendidos(mes, clinicaId || undefined),
    getClinicasAtivas(),
  ]);

  return (
    <DashboardClient
      initialMes={mes}
      initialClinicaId={clinicaId}
      initialKpis={kpis}
      initialDre={dre}
      initialRepasse={repasse}
      initialRanking={ranking}
      initialStatus={status}
      initialChartData={chartData}
      initialChartLiquido={chartLiquido}
      initialOrcamentosFechados={orcamentosFechados}
      initialOrcamentosAbertos={orcamentosAbertos}
      initialEvolucao={evolucao}
      initialProcedimentos={procedimentos}
      initialTratamentosVendidos={tratamentosVendidos}
      clinicas={clinicas}
    />
  );
}

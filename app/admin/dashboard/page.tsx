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
  fetchTratamentosEvolucao,
} from "@/lib/dashboard-queries";
import { autoCalcResumoSeNecessario } from "@/lib/resumo-staleness";
import { getClinicasAtivas } from "../upload/actions";
import { fetchMesesFechados } from "../configuracoes/fechamento/actions";
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

  // Auto-calc resumo se dados estiverem desatualizados
  await autoCalcResumoSeNecessario(mes, clinicaId || undefined);

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
    tratamentosEvolucao,
    clinicas,
    mesesFechados,
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
    fetchTratamentosEvolucao(mes, 6, clinicaId || undefined),
    getClinicasAtivas(),
    fetchMesesFechados(),
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
      initialTratamentosEvolucao={tratamentosEvolucao}
      clinicas={clinicas}
      mesesFechados={mesesFechados}
    />
  );
}

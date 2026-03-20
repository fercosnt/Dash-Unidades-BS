import {
  fetchKpisAdminV2,
  fetchDreAdmin,
  fetchRepasseAdmin,
  fetchProcedimentosRanking,
  fetchTratamentosVendidos,
  fetchOrcamentosFechados,
  fetchChartDataAdmin,
  fetchChartLiquidoAdmin,
} from "@/lib/dashboard-queries";
import { PrintClient } from "./PrintClient";

export default async function ImprimirPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; clinicaId?: string; clinicaNome?: string }>;
}) {
  const params = await searchParams;
  const mes = params.mes ?? new Date().toISOString().slice(0, 7);
  const clinicaId = params.clinicaId ?? "";
  const clinicaNome = params.clinicaNome ?? "Todas as Clínicas";

  const mesParaGraficos = mes === "all" ? new Date().toISOString().slice(0, 7) : mes;

  const [kpis, dre, repasse, procedimentos, tratamentos, orcamentosFechados, chartData, chartLiquido] = await Promise.all([
    fetchKpisAdminV2(mes, clinicaId || undefined),
    fetchDreAdmin(mes, clinicaId || undefined),
    fetchRepasseAdmin(mes, clinicaId || undefined),
    fetchProcedimentosRanking(mes, clinicaId || undefined),
    fetchTratamentosVendidos(mes, clinicaId || undefined),
    fetchOrcamentosFechados(mes, clinicaId || undefined),
    fetchChartDataAdmin(mesParaGraficos, 12, clinicaId || undefined),
    fetchChartLiquidoAdmin(mesParaGraficos, 12, clinicaId || undefined),
  ]);

  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  let mesFmt: string;
  if (mes === "all") {
    mesFmt = "Todos os meses";
  } else {
    const [y, m] = mes.split("-");
    mesFmt = `${MONTHS[Number(m) - 1]}/${y}`;
  }

  return (
    <PrintClient
      mes={mesFmt}
      clinicaNome={clinicaNome}
      kpis={kpis}
      dre={dre}
      repasse={repasse}
      procedimentos={procedimentos}
      tratamentos={tratamentos}
      orcamentosFechados={orcamentosFechados}
      chartData={chartData}
      chartLiquido={chartLiquido}
    />
  );
}

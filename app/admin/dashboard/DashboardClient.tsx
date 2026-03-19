"use client";

import { useState, useEffect } from "react";
import { PeriodoSelector } from "@/components/dashboard/PeriodoSelector";
import { ClinicaSelector } from "@/components/dashboard/ClinicaSelector";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ChartFaturamentoRecebimento } from "@/components/dashboard/ChartFaturamentoRecebimento";
import { ChartEvolucaoLiquido } from "@/components/dashboard/ChartEvolucaoLiquido";
import { StatusUploads } from "@/components/dashboard/StatusUploads";
import { RankingClinicas } from "@/components/dashboard/RankingClinicas";
import { DreCascata } from "@/components/dashboard/DreCascata";
import { RepasseMes } from "@/components/dashboard/RepasseMes";
import { ChartVendasEvolucao } from "@/components/dashboard/ChartVendasEvolucao";
import { ChartProcedimentosPizza } from "@/components/dashboard/ChartProcedimentosPizza";
import { TabelaTratamentosVendidos } from "@/components/dashboard/TabelaTratamentosVendidos";
import { ChartTratamentosEvolucao } from "@/components/dashboard/ChartTratamentosEvolucao";
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
import type {
  KpisAdminV2,
  DreAdminData,
  RepasseAdminData,
  RankingClinica,
  UploadStatusItem,
  ChartDataAdminPoint,
  ChartLiquidoAdminPoint,
  OrcamentoFechadoItem,
  OrcamentoAbertoItem,
  ChartVendasPoint,
  ProcedimentoRankingItem,
  TratamentoVendidoItem,
  TratamentosEvolucaoData,
} from "@/types/dashboard.types";

type Tab = "resumo" | "vendas" | "procedimentos" | "clinicas";

type DashboardClientProps = {
  initialMes: string;
  initialClinicaId?: string;
  initialKpis: KpisAdminV2;
  initialDre: DreAdminData;
  initialRepasse: RepasseAdminData;
  initialRanking: RankingClinica[];
  initialStatus: UploadStatusItem[];
  initialChartData: ChartDataAdminPoint[];
  initialChartLiquido: ChartLiquidoAdminPoint[];
  initialOrcamentosFechados: OrcamentoFechadoItem[];
  initialOrcamentosAbertos: OrcamentoAbertoItem[];
  initialEvolucao: ChartVendasPoint[];
  initialProcedimentos: ProcedimentoRankingItem[];
  initialTratamentosVendidos: TratamentoVendidoItem[];
  initialTratamentosEvolucao: TratamentosEvolucaoData;
  clinicas: { id: string; nome: string }[];
  mesesFechados?: string[];
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function DashboardClient({
  initialMes,
  initialClinicaId,
  initialKpis,
  initialDre,
  initialRepasse,
  initialRanking,
  initialStatus,
  initialChartData,
  initialChartLiquido,
  initialOrcamentosFechados,
  initialOrcamentosAbertos,
  initialEvolucao,
  initialProcedimentos,
  initialTratamentosVendidos,
  initialTratamentosEvolucao,
  clinicas,
  mesesFechados = [],
}: DashboardClientProps) {
  const [mes, setMes] = useState(initialMes);
  const [clinicaId, setClinicaId] = useState(initialClinicaId ?? "");
  const [activeTab, setActiveTab] = useState<Tab>("resumo");
  const [kpis, setKpis] = useState(initialKpis);
  const [dre, setDre] = useState(initialDre);
  const [repasse, setRepasse] = useState(initialRepasse);
  const [ranking, setRanking] = useState(initialRanking);
  const [status, setStatus] = useState(initialStatus);
  const [chartData, setChartData] = useState(initialChartData);
  const [chartLiquido, setChartLiquido] = useState(initialChartLiquido);
  const [orcamentosFechados, setOrcamentosFechados] = useState(initialOrcamentosFechados);
  const [orcamentosAbertos, setOrcamentosAbertos] = useState(initialOrcamentosAbertos);
  const [evolucao, setEvolucao] = useState(initialEvolucao);
  const [procedimentos, setProcedimentos] = useState(initialProcedimentos);
  const [tratamentosVendidos, setTratamentosVendidos] = useState(initialTratamentosVendidos);
  const [tratamentosEvolucao, setTratamentosEvolucao] = useState(initialTratamentosEvolucao);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mes === initialMes && clinicaId === (initialClinicaId ?? "")) return;
    setLoading(true);
    const mesParaGraficos = mes === "all" ? initialMes : mes;
    Promise.all([
      fetchKpisAdminV2(mes, clinicaId || undefined),
      fetchDreAdmin(mes, clinicaId || undefined),
      fetchRepasseAdmin(mes, clinicaId || undefined),
      fetchRankingClinicas(mes, clinicaId || undefined),
      fetchStatusUploads(mes, clinicaId || undefined),
      fetchChartDataAdmin(mesParaGraficos, 12, clinicaId || undefined),
      fetchChartLiquidoAdmin(mesParaGraficos, 12, clinicaId || undefined),
      fetchOrcamentosFechados(mes, clinicaId || undefined),
      fetchOrcamentosAbertos(mes, clinicaId || undefined),
      mes !== "all" ? fetchVendasEvolucao(mes, 3, clinicaId || undefined) : Promise.resolve(initialEvolucao),
      fetchProcedimentosRanking(mes, clinicaId || undefined),
      fetchTratamentosVendidos(mes, clinicaId || undefined),
      fetchTratamentosEvolucao(mes === "all" ? initialMes : mes, 6, clinicaId || undefined),
    ]).then(([k, d, rp, r, s, cd, cl, of, oa, ev, proc, tv, te]) => {
      setKpis(k);
      setDre(d);
      setRepasse(rp);
      setRanking(r);
      setStatus(s);
      setChartData(cd);
      setChartLiquido(cl);
      setOrcamentosFechados(of);
      setOrcamentosAbertos(oa);
      setEvolucao(ev);
      setProcedimentos(proc);
      setTratamentosVendidos(tv);
      setTratamentosEvolucao(te);
      setLoading(false);
    });
  }, [mes, clinicaId, initialMes, initialClinicaId, initialEvolucao]);

  const TABS: { id: Tab; label: string }[] = [
    { id: "resumo", label: "Resumo" },
    { id: "vendas", label: "Vendas" },
    { id: "procedimentos", label: "Procedimentos" },
    { id: "clinicas", label: "Clínicas" },
  ];

  return (
    <div className="space-y-6">
      {/* Header com abas + seletor de período + botão calcular */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ClinicaSelector clinicas={clinicas} selectedClinicaId={clinicaId} onChange={setClinicaId} />
          <PeriodoSelector selectedPeriodo={mes} onChange={setMes} mesesFechados={mesesFechados} />
          <button
            type="button"
            onClick={() => {
              const clinicaAtual = clinicas.find((c) => c.id === clinicaId);
              const nome = encodeURIComponent(clinicaAtual?.nome ?? "Todas as Clínicas");
              window.open(`/admin/dashboard/imprimir?mes=${mes}&clinicaId=${clinicaId}&clinicaNome=${nome}`, "_blank");
            }}
            title="Exportar relatório PDF"
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/20 hover:text-white transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 w-full items-center justify-center text-sm text-white">
          Carregando...
        </div>
      ) : (
        <>
          {/* ── ABA RESUMO ── */}
          {activeTab === "resumo" && (
            <div className="space-y-6">
              {!kpis.resumoCalculado && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
                  Nenhum dado encontrado para este período. Verifique se os uploads foram realizados.
                </div>
              )}

              {/* KPIs financeiros */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiCard
                  label="Faturamento Bruto"
                  value={kpis.faturamentoBruto}
                  format="currency"
                  icon="money"
                  accentColor="primary"
                />
                <KpiCard
                  label="Total Recebido"
                  value={kpis.totalRecebidoMes}
                  format="currency"
                  icon="receive"
                  accentColor="success"
                />
                <KpiCard
                  label="A Receber"
                  value={kpis.totalAReceberMes}
                  format="currency"
                  icon="pending"
                  accentColor="warning"
                />
                <KpiCard
                  label="Inadimplente"
                  value={kpis.totalInadimplente}
                  format="currency"
                  icon="alert"
                  accentColor="danger"
                />
              </div>

              {/* KPIs operacionais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiCard
                  label="Orçamentos Fechados"
                  value={kpis.orcamentosFechadosValor}
                  format="currency"
                  icon="chart"
                  accentColor="primary"
                  subtitle={`${kpis.orcamentosFechadosQtde} fechados`}
                />
                <KpiCard
                  label="Orçamentos Abertos"
                  value={kpis.orcamentosAbertosValor}
                  format="currency"
                  icon="pending"
                  accentColor="secondary"
                  subtitle={`${kpis.orcamentosAbertosQtde} em aberto`}
                />
                <KpiCard
                  label="Procedimentos Realizados"
                  value={kpis.procedimentosRealizados}
                  format="number"
                  icon="percent"
                  accentColor="accent"
                />
                <KpiCard
                  label="Custo Total"
                  value={kpis.totalCustosProcedimentos + kpis.totalCustoMaoObra}
                  format="currency"
                  icon="alert"
                  accentColor="warning"
                  subtitle="Proc. + Mão de obra"
                />
              </div>

              {/* DRE + Repasse */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DreCascata data={dre} />
                <RepasseMes data={repasse} />
              </div>

              {/* Gráficos históricos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartFaturamentoRecebimento data={chartData} />
                <ChartEvolucaoLiquido data={chartLiquido} />
              </div>
            </div>
          )}

          {/* ── ABA VENDAS ── */}
          {activeTab === "vendas" && (
            <div className="space-y-6">
              <ChartVendasEvolucao data={evolucao} />

              {/* Totais em cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-white p-5 shadow-md">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-3">
                    Orçamentos Fechados
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 tabular-nums">
                    {formatCurrency(kpis.orcamentosFechadosValor)}
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">
                    {kpis.orcamentosFechadosQtde} orçamentos •{" "}
                    ticket médio:{" "}
                    {kpis.orcamentosFechadosQtde > 0
                      ? formatCurrency(kpis.orcamentosFechadosValor / kpis.orcamentosFechadosQtde)
                      : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-5 shadow-md">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-3">
                    Orçamentos Abertos
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 tabular-nums">
                    {formatCurrency(kpis.orcamentosAbertosValor)}
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">
                    {kpis.orcamentosAbertosQtde} orçamentos em aberto
                  </p>
                </div>
              </div>

              {/* Tabela orçamentos fechados */}
              <div className="rounded-xl bg-white shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-100">
                  <h3 className="text-sm font-heading font-bold text-neutral-900">
                    Orçamentos Fechados
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                        <th className="px-4 py-3 text-left font-medium">Paciente</th>
                        <th className="px-4 py-3 text-left font-medium">Clínica</th>
                        <th className="px-4 py-3 text-right font-medium">Valor Total</th>
                        <th className="px-4 py-3 text-right font-medium">Pago</th>
                        <th className="px-4 py-3 text-right font-medium">Em Aberto</th>
                        <th className="px-4 py-3 text-center font-medium">Status</th>
                        <th className="px-4 py-3 text-center font-medium">Fechamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orcamentosFechados.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                            Nenhum orçamento fechado neste período
                          </td>
                        </tr>
                      ) : (
                        orcamentosFechados.map((o) => (
                          <tr key={o.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                            <td className="px-4 py-3 text-neutral-800">{o.pacienteNome}</td>
                            <td className="px-4 py-3 text-neutral-500">{o.clinicaNome}</td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium text-neutral-900">
                              {formatCurrency(o.valorTotal)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-success-700">
                              {formatCurrency(o.valorPago)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-danger-700">
                              {formatCurrency(o.valorEmAberto)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success-700">
                                {o.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-neutral-500">
                              {formatDate(o.dataFechamento)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabela orçamentos abertos */}
              <div className="rounded-xl bg-white shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-100">
                  <h3 className="text-sm font-heading font-bold text-neutral-900">
                    Orçamentos Abertos
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                        <th className="px-4 py-3 text-left font-medium">Paciente</th>
                        <th className="px-4 py-3 text-left font-medium">Clínica</th>
                        <th className="px-4 py-3 text-right font-medium">Valor Total</th>
                        <th className="px-4 py-3 text-center font-medium">Criação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orcamentosAbertos.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                            Nenhum orçamento aberto neste período
                          </td>
                        </tr>
                      ) : (
                        orcamentosAbertos.map((o) => (
                          <tr key={o.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                            <td className="px-4 py-3 text-neutral-800">{o.pacienteNome}</td>
                            <td className="px-4 py-3 text-neutral-500">{o.clinicaNome}</td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium text-neutral-900">
                              {formatCurrency(o.valorTotal)}
                            </td>
                            <td className="px-4 py-3 text-center text-neutral-500">
                              {formatDate(o.dataCriacao)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Gráfico evolução por tratamento + Tabela tratamentos vendidos */}
              <ChartTratamentosEvolucao data={tratamentosEvolucao} />
              <TabelaTratamentosVendidos data={tratamentosVendidos} />
            </div>
          )}

          {/* ── ABA PROCEDIMENTOS ── */}
          {activeTab === "procedimentos" && (
            <ChartProcedimentosPizza data={procedimentos} className="w-full" />
          )}

          {/* ── ABA CLÍNICAS ── */}
          {activeTab === "clinicas" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RankingClinicas items={ranking} />
              <StatusUploads items={status} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

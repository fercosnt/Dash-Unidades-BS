"use client";

import { useState, useEffect } from "react";
import { PeriodoSelector } from "@/components/dashboard/PeriodoSelector";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ChartFaturamentoRecebimento } from "@/components/dashboard/ChartFaturamentoRecebimento";
import { ChartEvolucaoLiquido } from "@/components/dashboard/ChartEvolucaoLiquido";
import { StatusUploads } from "@/components/dashboard/StatusUploads";
import { RankingClinicas } from "@/components/dashboard/RankingClinicas";
import {
  fetchKpisAdmin,
  fetchRankingClinicas,
  fetchStatusUploads,
  fetchChartDataAdmin,
  fetchChartLiquidoAdmin,
} from "@/lib/dashboard-queries";
import type { KpisAdmin, RankingClinica, UploadStatusItem, ChartDataAdminPoint, ChartLiquidoAdminPoint } from "@/types/dashboard.types";

type DashboardClientProps = {
  initialMes: string;
  initialKpis: KpisAdmin;
  initialRanking: RankingClinica[];
  initialStatus: UploadStatusItem[];
  initialChartData: ChartDataAdminPoint[];
  initialChartLiquido: ChartLiquidoAdminPoint[];
  clinicas: { id: string; nome: string }[];
};

export function DashboardClient({
  initialMes,
  initialKpis,
  initialRanking,
  initialStatus,
  initialChartData,
  initialChartLiquido,
  clinicas,
}: DashboardClientProps) {
  const [mes, setMes] = useState(initialMes);
  const [kpis, setKpis] = useState(initialKpis);
  const [ranking, setRanking] = useState(initialRanking);
  const [status, setStatus] = useState(initialStatus);
  const [chartData, setChartData] = useState(initialChartData);
  const [chartLiquido, setChartLiquido] = useState(initialChartLiquido);
  const [loading, setLoading] = useState(false);
  const [resumoClinicaId, setResumoClinicaId] = useState("");
  const [resumoLoading, setResumoLoading] = useState(false);
  const [resumoMessage, setResumoMessage] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    if (mes === initialMes) return;
    setLoading(true);
    Promise.all([
      fetchKpisAdmin(mes),
      fetchRankingClinicas(mes),
      fetchStatusUploads(mes),
      fetchChartDataAdmin(mes, 12),
      fetchChartLiquidoAdmin(mes, 12),
    ]).then(([k, r, s, cd, cl]) => {
      setKpis(k);
      setRanking(r);
      setStatus(s);
      setChartData(cd);
      setChartLiquido(cl);
      setLoading(false);
    });
  }, [mes, initialMes]);

  async function handleCalcularResumo() {
    if (!resumoClinicaId) return;
    setResumoLoading(true);
    setResumoMessage(null);
    try {
      const res = await fetch("/api/resumo/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinica_id: resumoClinicaId, mes_referencia: mes }),
      });
      const data = await res.json();
      if (res.ok) {
        setResumoMessage({ tipo: "ok", texto: data.message ?? "Cálculo iniciado." });
        setTimeout(() => {
          Promise.all([fetchKpisAdmin(mes), fetchRankingClinicas(mes), fetchChartDataAdmin(mes, 12), fetchChartLiquidoAdmin(mes, 12)]).then(([k, r, cd, cl]) => {
            setKpis(k);
            setRanking(r);
            setChartData(cd);
            setChartLiquido(cl);
          });
        }, 2000);
      } else {
        setResumoMessage({ tipo: "erro", texto: data.error ?? "Erro ao disparar cálculo." });
      }
    } catch {
      setResumoMessage({ tipo: "erro", texto: "Erro de conexão." });
    } finally {
      setResumoLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-[#0A2463]">Visão geral</h2>
        <PeriodoSelector selectedPeriodo={mes} onChange={setMes} />
      </div>

      {!kpis.resumoCalculado && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Resumo não calculado para este período. Os KPIs abaixo referem-se ao que já foi lançado no sistema.
          Para gerar o resumo financeiro (valor líquido, parte BS/clínica), use o cálculo abaixo ou configure o n8n.
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Calcular resumo mensal</h3>
        <p className="text-xs text-slate-600 mb-3">
          Dispara o cálculo do resumo para uma clínica e o mês selecionado (via webhook n8n). Requer N8N_WEBHOOK_URL e N8N_WEBHOOK_SECRET configurados.
        </p>
        {resumoMessage && (
          <div
            className={`mb-3 rounded px-3 py-2 text-sm ${
              resumoMessage.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
          >
            {resumoMessage.texto}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-700">Clínica</span>
            <select
              value={resumoClinicaId}
              onChange={(e) => setResumoClinicaId(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {clinicas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>
          <span className="text-sm text-slate-500">Mês: {mes}</span>
          <button
            type="button"
            onClick={handleCalcularResumo}
            disabled={resumoLoading || !resumoClinicaId}
            className="rounded-md bg-[#0A2463] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {resumoLoading ? "Enviando..." : "Calcular resumo"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard label="Faturamento bruto" value={kpis.faturamentoBruto} format="currency" />
            <KpiCard label="Total recebido no mês" value={kpis.totalRecebidoMes} format="currency" />
            <KpiCard label="Total a receber" value={kpis.totalAReceberMes} format="currency" />
            <KpiCard label="Total inadimplente" value={kpis.totalInadimplente} format="currency" />
            <KpiCard label="Valor líquido total" value={kpis.valorLiquido} format="currency" />
            <KpiCard label="Parte Beauty Smile (60%)" value={kpis.valorBeautySmile} format="currency" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartFaturamentoRecebimento data={chartData} />
            <ChartEvolucaoLiquido data={chartLiquido} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StatusUploads items={status} />
            <RankingClinicas items={ranking} />
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PeriodoSelector } from "@/components/dashboard/PeriodoSelector";
import { KpiCard } from "@/components/dashboard/KpiCard";
import type { ClinicaInfo, ResumoClinica, OrcamentoFechadoRow, OrcamentoAbertoRow, TratamentoRow } from "./actions";
import {
  getResumoClinicaMes,
  getOrcamentosFechadosClinicaMes,
  getOrcamentosAbertosClinicaMes,
  getTratamentosClinicaMes,
} from "./actions";

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function formatDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s + "Z");
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

type ClinicaDetailClientProps = {
  clinica: ClinicaInfo;
  initialMes: string;
  initialResumo: ResumoClinica | null;
  initialOrcamentosFechados: OrcamentoFechadoRow[];
  initialOrcamentosAbertos: OrcamentoAbertoRow[];
  initialTratamentos: TratamentoRow[];
};

const TABS = ["Orçamentos fechados", "Orçamentos abertos", "Tratamentos executados", "Resumo financeiro"] as const;

export function ClinicaDetailClient({
  clinica,
  initialMes,
  initialResumo,
  initialOrcamentosFechados,
  initialOrcamentosAbertos,
  initialTratamentos,
}: ClinicaDetailClientProps) {
  const [mes, setMes] = useState(initialMes);
  const [tab, setTab] = useState(0);
  const [resumo, setResumo] = useState<ResumoClinica | null>(initialResumo);
  const [orcamentosFechados, setOrcamentosFechados] = useState(initialOrcamentosFechados);
  const [orcamentosAbertos, setOrcamentosAbertos] = useState(initialOrcamentosAbertos);
  const [tratamentos, setTratamentos] = useState(initialTratamentos);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [loading, setLoading] = useState(false);
  const [resumoLoading, setResumoLoading] = useState(false);
  const [resumoMessage, setResumoMessage] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    if (mes === initialMes) return;
    setLoading(true);
    Promise.all([
      getResumoClinicaMes(clinica.id, mes),
      getOrcamentosFechadosClinicaMes(clinica.id, mes, statusFilter),
      getOrcamentosAbertosClinicaMes(clinica.id, mes),
      getTratamentosClinicaMes(clinica.id, mes),
    ]).then(([r, of, oa, t]) => {
      setResumo(r);
      setOrcamentosFechados(of);
      setOrcamentosAbertos(oa);
      setTratamentos(t);
      setLoading(false);
    });
  }, [mes, clinica.id, initialMes]);

  useEffect(() => {
    if (mes === initialMes && statusFilter === "todos") return;
    getOrcamentosFechadosClinicaMes(clinica.id, mes, statusFilter).then(setOrcamentosFechados);
  }, [statusFilter, clinica.id, mes, initialMes]);

  async function handleCalcularResumo() {
    setResumoLoading(true);
    setResumoMessage(null);
    try {
      const res = await fetch("/api/resumo/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinica_id: clinica.id, mes_referencia: mes }),
      });
      const data = await res.json();
      if (res.ok) {
        setResumoMessage({ tipo: "ok", texto: data.message ?? "Cálculo iniciado." });
        const r = await getResumoClinicaMes(clinica.id, mes);
        setResumo(r);
      } else {
        setResumoMessage({ tipo: "erro", texto: data.error ?? "Erro ao disparar cálculo." });
      }
    } catch {
      setResumoMessage({ tipo: "erro", texto: "Erro de conexão." });
    } finally {
      setResumoLoading(false);
    }
  }

  const custosTotais = resumo
    ? resumo.totalCustosProcedimentos + resumo.totalCustoMaoDeObra + resumo.totalComissoesMedicas
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/dashboard"
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          ← Voltar ao dashboard
        </Link>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-neutral-800">{clinica.nome}</h1>
            <p className="text-sm text-neutral-600 mt-1">
              {clinica.cnpj && `CNPJ ${clinica.cnpj}`}
              {clinica.responsavel && ` · ${clinica.responsavel}`}
            </p>
            {(clinica.email || clinica.telefone) && (
              <p className="text-xs text-neutral-500 mt-0.5">
                {clinica.email}
                {clinica.telefone && ` · ${clinica.telefone}`}
              </p>
            )}
            <span
              className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                clinica.ativo ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {clinica.ativo ? "Ativa" : "Inativa"}
            </span>
          </div>
          <PeriodoSelector selectedPeriodo={mes} onChange={setMes} />
        </div>
      </div>

      {loading ? (
        <p className="text-neutral-500 text-sm">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              label="Faturamento bruto"
              value={resumo?.faturamentoBruto ?? 0}
              format="currency"
              icon="money"
              accentColor="primary"
            />
            <KpiCard
              label="Custos totais"
              value={custosTotais}
              format="currency"
              icon="pending"
              accentColor="primary"
            />
            <KpiCard
              label="Valor líquido"
              value={resumo?.valorLiquido ?? 0}
              format="currency"
              icon="chart"
              accentColor="primary"
            />
            <KpiCard
              label="Parte Beauty Smile (60%)"
              value={resumo?.valorBeautySmile ?? 0}
              format="currency"
              icon="percent"
              accentColor="primary"
            />
            <KpiCard
              label="Parte clínica (40%)"
              value={resumo?.valorClinica ?? 0}
              format="currency"
              icon="percent"
              accentColor="primary"
            />
            <KpiCard
              label="Inadimplência"
              value={resumo?.totalInadimplente ?? 0}
              format="currency"
              icon="alert"
              accentColor="danger"
            />
          </div>

          <div className="border-b border-neutral-200">
            <nav className="flex gap-6">
              {TABS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setTab(i)}
                  className={`py-3 px-1 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === i
                      ? "border-primary-600 text-primary-600"
                      : "border-transparent text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {tab === 0 && (
            <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
              <div className="px-4 py-3 bg-neutral-50 border-b flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-neutral-700">Filtrar por status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="em_aberto">Em aberto</option>
                  <option value="parcial">Parcial</option>
                  <option value="quitado">Quitado</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-neutral-700">Paciente</th>
                      <th className="px-4 py-2 text-right font-medium text-neutral-700">Valor total</th>
                      <th className="px-4 py-2 text-right font-medium text-neutral-700">Valor pago</th>
                      <th className="px-4 py-2 text-right font-medium text-neutral-700">Em aberto</th>
                      <th className="px-4 py-2 text-left font-medium text-neutral-700">Status</th>
                      <th className="px-4 py-2 text-left font-medium text-neutral-700">Data fechamento</th>
                      <th className="px-4 py-2 text-left font-medium text-neutral-700">Indicação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {orcamentosFechados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                          Nenhum orçamento fechado neste período.
                        </td>
                      </tr>
                    ) : (
                      orcamentosFechados.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-2 font-medium text-neutral-900">{row.pacienteNome}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(row.valorTotal)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(row.valorPago)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(row.valorEmAberto)}</td>
                          <td className="px-4 py-2">
                            <span
                              className={
                                row.status === "quitado"
                                  ? "text-green-600"
                                  : row.status === "parcial"
                                    ? "text-amber-600"
                                    : "text-red-600"
                              }
                            >
                              {row.status === "quitado" ? "Quitado" : row.status === "parcial" ? "Parcial" : "Em aberto"}
                            </span>
                          </td>
                          <td className="px-4 py-2">{formatDate(row.dataFechamento)}</td>
                          <td className="px-4 py-2">{row.temIndicacao ? "Sim" : "Não"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 1 && (
            <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-neutral-700">Paciente</th>
                      <th className="px-4 py-2 text-right font-medium text-neutral-700">Valor total</th>
                      <th className="px-4 py-2 text-left font-medium text-neutral-700">Status</th>
                      <th className="px-4 py-2 text-left font-medium text-neutral-700">Data criação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {orcamentosAbertos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                          Nenhum orçamento aberto neste período.
                        </td>
                      </tr>
                    ) : (
                      orcamentosAbertos.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-2 font-medium text-neutral-900">{row.pacienteNome}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(row.valorTotal)}</td>
                          <td className="px-4 py-2">{row.status}</td>
                          <td className="px-4 py-2">{formatDate(row.dataCriacao)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 2 && (
            <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-neutral-700">Paciente</th>
                      <th className="px-4 py-2 text-left font-medium text-neutral-700">Procedimento</th>
                      <th className="px-4 py-2 text-right font-medium text-neutral-700">Qtd</th>
                      <th className="px-4 py-2 text-left font-medium text-neutral-700">Data execução</th>
                      <th className="px-4 py-2 text-right font-medium text-neutral-700">Custo (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {tratamentos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                          Nenhum tratamento neste período.
                        </td>
                      </tr>
                    ) : (
                      tratamentos.map((row) => (
                        <tr
                          key={row.id}
                          className={row.procedimentoId == null ? "bg-amber-50" : ""}
                          title={row.procedimentoId == null ? "Procedimento não encontrado — custo não contabilizado" : ""}
                        >
                          <td className="px-4 py-2 font-medium text-neutral-900">{row.pacienteNome}</td>
                          <td className="px-4 py-2">
                            {row.procedimentoNome ?? "—"}
                            {row.procedimentoId == null && (
                              <span className="ml-1 text-amber-600 text-xs">(sem match)</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">{row.quantidade}</td>
                          <td className="px-4 py-2">{formatDate(row.dataExecucao)}</td>
                          <td className="px-4 py-2 text-right">
                            {row.custoFixo != null ? formatCurrency(row.custoFixo * row.quantidade) : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 3 && (
            <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-4">
              {resumoMessage && (
                <div
                  className={`rounded px-3 py-2 text-sm ${
                    resumoMessage.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                  }`}
                >
                  {resumoMessage.texto}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCalcularResumo}
                  disabled={resumoLoading}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {resumoLoading ? "Enviando..." : "Calcular / Recalcular resumo"}
                </button>
              </div>
              <div className="border-t border-neutral-200 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Faturamento bruto</span>
                  <span className="font-medium">{formatCurrency(resumo?.faturamentoBruto ?? 0)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>(-) Custos procedimentos</span>
                  <span>{formatCurrency(resumo?.totalCustosProcedimentos ?? 0)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>(-) Custo mão de obra</span>
                  <span>{formatCurrency(resumo?.totalCustoMaoDeObra ?? 0)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>(-) Taxa cartão</span>
                  <span>{formatCurrency(resumo?.totalTaxaCartao ?? 0)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>(-) Imposto NF</span>
                  <span>{formatCurrency(resumo?.totalImpostoNf ?? 0)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>(-) Comissões médicas</span>
                  <span>{formatCurrency(resumo?.totalComissoesMedicas ?? 0)}</span>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-2 font-medium">
                  <span>= Valor líquido</span>
                  <span className="text-primary-600">{formatCurrency(resumo?.valorLiquido ?? 0)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Parte Beauty Smile (60%)</span>
                  <span>{formatCurrency(resumo?.valorBeautySmile ?? 0)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Parte clínica (40%)</span>
                  <span>{formatCurrency(resumo?.valorClinica ?? 0)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

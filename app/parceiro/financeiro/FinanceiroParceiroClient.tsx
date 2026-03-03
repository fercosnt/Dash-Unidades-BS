"use client";

import { useState, useEffect, useRef } from "react";
import { getResumoMes, type ResumoMensal } from "./actions";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatMonth(mesRef: string): string {
  const [y, m] = mesRef.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

type Props = {
  meses: string[];
  initialMes: string;
  initialResumo: ResumoMensal | null;
  historico: ResumoMensal[];
};

export function FinanceiroParceiroClient({
  meses,
  initialMes,
  initialResumo,
  historico,
}: Props) {
  const [mesRef, setMesRef] = useState(initialMes);
  const [resumo, setResumo] = useState<ResumoMensal | null>(initialResumo);
  const [loading, setLoading] = useState(false);
  const firstMount = useRef(true);

  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    setLoading(true);
    getResumoMes(mesRef).then((r) => {
      setResumo(r);
      setLoading(false);
    });
  }, [mesRef]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Financeiro</h2>
        <p className="mt-1 text-sm text-white/80">
          Resumo financeiro mensal e histórico da sua clínica.
        </p>
      </div>

      {/* Month selector */}
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-white/80">Mês de referência</span>
          <select
            value={mesRef}
            onChange={(e) => setMesRef(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
          >
            {meses.map((m) => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="flex h-40 w-full items-center justify-center gap-2 text-sm text-neutral-800">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Carregando...
        </div>
      ) : !resumo ? (
        <div className="rounded-xl bg-white p-8 shadow-md text-center">
          <p className="text-neutral-900 font-semibold">Nenhum resumo financeiro disponível para {formatMonth(mesRef)}.</p>
          <p className="mt-1 text-sm text-neutral-900">Os dados aparecerão após o cálculo mensal ser processado.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white p-5 shadow-md">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 min-h-[2rem]">
                Faturamento bruto
              </p>
              <p className="font-heading font-semibold text-neutral-900 text-lg">
                {formatCurrency(resumo.faturamentoBruto)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-md">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 min-h-[2rem]">
                Valor líquido
              </p>
              <p className="font-heading font-semibold text-neutral-900 text-lg">
                {formatCurrency(resumo.valorLiquido)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-md">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 min-h-[2rem]">
                Parte da clínica (40%)
              </p>
              <p className="font-heading font-semibold text-neutral-900 text-lg">
                {formatCurrency(resumo.valorClinica)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-md">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 min-h-[2rem]">
                Recebido no mês
              </p>
              <p className="font-heading font-semibold text-neutral-900 text-lg">
                {formatCurrency(resumo.totalRecebidoMes)}
              </p>
            </div>
          </div>

          {/* Extrato */}
          <div className="rounded-xl bg-white shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h3 className="text-sm font-heading font-bold text-neutral-800">
                Extrato financeiro — {formatMonth(mesRef)}
              </h3>
            </div>
            <div className="px-6 py-4 space-y-3 text-sm">
              <ExtratoLine label="Faturamento bruto" value={resumo.faturamentoBruto} bold />
              <div className="border-t border-neutral-100 pt-3 space-y-2">
                <ExtratoLine label="(-) Custos procedimentos" value={-resumo.totalCustosProcedimentos} muted />
                <ExtratoLine label="(-) Custo mão de obra" value={-resumo.totalCustoMaoDeObra} muted />
                <ExtratoLine label="(-) Taxa cartão" value={-resumo.totalTaxaCartao} muted />
                <ExtratoLine label="(-) Imposto NF" value={-resumo.totalImpostoNf} muted />
                <ExtratoLine label="(-) Comissões médicas" value={-resumo.totalComissoesMedicas} muted />
              </div>
              <div className="border-t border-neutral-200 pt-3">
                <ExtratoLine label="= Valor líquido" value={resumo.valorLiquido} bold highlight />
              </div>
              <div className="border-t border-neutral-100 pt-3 space-y-2">
                <ExtratoLine label="Parte Beauty Smile (60%)" value={resumo.valorBeautySmile} muted />
                <ExtratoLine label="Parte da clínica (40%)" value={resumo.valorClinica} bold />
              </div>
              <div className="border-t border-neutral-100 pt-3 space-y-2">
                <ExtratoLine label="Recebido no mês" value={resumo.totalRecebidoMes} muted />
                <ExtratoLine label="A receber (projetado)" value={resumo.totalAReceberMes} muted />
                <ExtratoLine label="Total inadimplente" value={resumo.totalInadimplente} danger />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Histórico */}
      {historico.length > 0 && (
        <div className="rounded-xl bg-white shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100">
            <h3 className="text-sm font-heading font-bold text-neutral-800">Histórico (últimos 12 meses)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-neutral-700">Mês</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-700">Faturamento</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-700">Líquido</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-700">Parte clínica</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-700">Recebido</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-700">Inadimplente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {historico.map((row) => (
                  <tr key={row.mesReferencia} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-2 font-medium text-neutral-800">{formatMonth(row.mesReferencia)}</td>
                    <td className="px-4 py-2 text-right text-neutral-700">{formatCurrency(row.faturamentoBruto)}</td>
                    <td className="px-4 py-2 text-right text-neutral-700">{formatCurrency(row.valorLiquido)}</td>
                    <td className="px-4 py-2 text-right font-medium text-neutral-900">{formatCurrency(row.valorClinica)}</td>
                    <td className="px-4 py-2 text-right text-neutral-700">{formatCurrency(row.totalRecebidoMes)}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={row.totalInadimplente > 0 ? "font-medium text-amber-700" : "text-neutral-400"}>
                        {row.totalInadimplente > 0 ? formatCurrency(row.totalInadimplente) : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ExtratoLine({
  label,
  value,
  bold,
  muted,
  highlight,
  danger,
}: {
  label: string;
  value: number;
  bold?: boolean;
  muted?: boolean;
  highlight?: boolean;
  danger?: boolean;
}) {
  let valueClass = "text-neutral-900";
  if (muted) valueClass = "text-neutral-600";
  if (highlight) valueClass = "text-neutral-900";
  if (danger) valueClass = "text-amber-700 font-medium";
  if (bold && !danger) valueClass += " font-semibold";

  return (
    <div className="flex justify-between items-center">
      <span className={muted ? "text-neutral-500" : "text-neutral-700"}>{label}</span>
      <span className={valueClass}>{formatCurrency(Math.abs(value))}</span>
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  type InadimplenteRow,
} from "@/app/admin/inadimplencia/actions";
import type { ProjecaoRow } from "@/app/admin/pagamentos/actions";

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

function formatMes(mes: string): string {
  const str = String(mes ?? "").trim();
  const match = str.match(/^(\d{4})-(\d{2})/);
  if (!match) return str || "—";
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const d = new Date(year, month, 1);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

export function InadimplenciaParceiroClient({
  initialList,
  initialKpis,
  projecao = [],
}: {
  initialList: InadimplenteRow[];
  initialKpis: {
    totalInadimplente: number;
    quantidadePacientes: number;
    maiorValor: number;
    mediaPorPaciente: number;
  };
  projecao?: ProjecaoRow[];
}) {
  const list = initialList;
  const kpis = initialKpis;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#0A2463]">Inadimplência</h2>
      <p className="text-slate-600 text-sm">
        Orçamentos da sua clínica com saldo em aberto. Apenas visualização.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total inadimplente</p>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(kpis.totalInadimplente)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Pacientes inadimplentes</p>
          <p className="text-xl font-bold text-slate-900">{kpis.quantidadePacientes}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Maior valor em aberto</p>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(kpis.maiorValor)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Média por paciente</p>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(kpis.mediaPorPaciente)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Paciente</th>
              <th className="px-4 py-2 text-right font-medium text-slate-700">Valor total</th>
              <th className="px-4 py-2 text-right font-medium text-slate-700">Valor pago</th>
              <th className="px-4 py-2 text-right font-medium text-slate-700">Em aberto</th>
              <th className="px-4 py-2 text-right font-medium text-slate-700">Dias</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Status</th>
              <th className="px-4 py-2 text-left font-medium text-slate-700">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Nenhum inadimplente no momento.
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.orcamento_fechado_id}>
                  <td className="px-4 py-2 text-slate-900">{row.paciente_nome}</td>
                  <td className="px-4 py-2 text-right text-slate-700">
                    {formatCurrency(Number(row.valor_total))}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-700">
                    {formatCurrency(Number(row.valor_pago))}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-amber-700">
                    {formatCurrency(Number(row.valor_em_aberto))}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600">
                    {row.dias_em_aberto ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === "quitado"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/parceiro/inadimplencia/${row.orcamento_fechado_id}`}
                      className="text-[#0A2463] hover:underline text-xs font-medium"
                    >
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {projecao.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-slate-800">Próximos recebimentos (cartão D+30)</h3>
          <p className="text-slate-600 text-sm">
            Projeção dos próximos 6 meses com base nas parcelas de cartão já registradas.
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">Mês</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-700">Total projetado</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-700">Parcelas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {projecao.map((row, i) => (
                  <tr key={`${row.mes_recebimento}-${row.clinica_id}-${i}`}>
                    <td className="px-4 py-2 text-slate-800">
                      {formatMes(String(row.mes_recebimento))}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900">
                      {formatCurrency(Number(row.total_projetado))}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">
                      {row.total_parcelas}
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

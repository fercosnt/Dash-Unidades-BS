"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  type InadimplenteRow,
} from "@/app/admin/inadimplencia/actions";
import type { ProjecaoRow } from "@/app/admin/pagamentos/actions";

const PAGE_SIZE = 50;

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
  const [valorMin, setValorMin] = useState<number | undefined>();
  const [diasMin, setDiasMin] = useState<number | undefined>();

  const list = useMemo(() => {
    let rows = initialList;
    if (valorMin != null) {
      rows = rows.filter((r) => Number(r.valor_em_aberto) >= valorMin);
    }
    if (diasMin != null) {
      rows = rows.filter((r) => (r.dias_em_aberto ?? 0) >= diasMin);
    }
    return rows;
  }, [initialList, valorMin, diasMin]);

  const kpis = initialKpis;

  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);

  const [projPage, setProjPage] = useState(1);
  const [projExpanded, setProjExpanded] = useState(false);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const visibleRows = expanded
    ? list
    : list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const projTotalPages = Math.max(1, Math.ceil(projecao.length / PAGE_SIZE));
  const visibleProjecao = projExpanded
    ? projecao
    : projecao.slice((projPage - 1) * PAGE_SIZE, projPage * PAGE_SIZE);

  function goTo(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }

  function projGoTo(p: number) {
    setProjPage(Math.max(1, Math.min(p, projTotalPages)));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Inadimplência</h2>
      <p className="mt-0.5 text-sm text-white/80">
        Orçamentos da sua clínica com saldo em aberto. Apenas visualização.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium text-neutral-500">Total inadimplente</p>
          <p className="text-xl font-bold text-neutral-900">{formatCurrency(kpis.totalInadimplente)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium text-neutral-500">Pacientes inadimplentes</p>
          <p className="text-xl font-bold text-neutral-900">{kpis.quantidadePacientes}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium text-neutral-500">Maior valor em aberto</p>
          <p className="text-xl font-bold text-neutral-900">{formatCurrency(kpis.maiorValor)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium text-neutral-500">Média por paciente</p>
          <p className="text-xl font-bold text-neutral-900">{formatCurrency(kpis.mediaPorPaciente)}</p>
        </div>
      </div>

      {/* Filtros locais */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-white/80">Valor mínimo (R$)</span>
          <select
            value={valorMin ?? ""}
            onChange={(e) => setValorMin(e.target.value ? Number(e.target.value) : undefined)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Qualquer</option>
            <option value="1000">&gt; R$ 1.000</option>
            <option value="5000">&gt; R$ 5.000</option>
            <option value="10000">&gt; R$ 10.000</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-white/80">Dias em aberto</span>
          <select
            value={diasMin ?? ""}
            onChange={(e) => setDiasMin(e.target.value ? Number(e.target.value) : undefined)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Qualquer</option>
            <option value="30">&gt; 30 dias</option>
            <option value="60">&gt; 60 dias</option>
            <option value="90">&gt; 90 dias</option>
          </select>
        </label>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <p className="text-sm text-neutral-500">
            {expanded ? (
              <>{list.length} registros</>
            ) : (
              <>
                {Math.min((page - 1) * PAGE_SIZE + 1, list.length)}–{Math.min(page * PAGE_SIZE, list.length)} de {list.length} registros
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => { setExpanded((v) => !v); setPage(1); }}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            {expanded ? "Paginar tabela" : "Expandir tudo"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Paciente</th>
                <th className="px-4 py-2 text-right font-medium text-neutral-700">Valor total</th>
                <th className="px-4 py-2 text-right font-medium text-neutral-700">Valor pago</th>
                <th className="px-4 py-2 text-right font-medium text-neutral-700">Em aberto</th>
                <th className="px-4 py-2 text-right font-medium text-neutral-700">Dias</th>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Status</th>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                    Nenhum inadimplente no momento.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={row.orcamento_fechado_id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-2 text-neutral-900">{row.paciente_nome}</td>
                    <td className="px-4 py-2 text-right text-neutral-700">
                      {formatCurrency(Number(row.valor_total))}
                    </td>
                    <td className="px-4 py-2 text-right text-neutral-700">
                      {formatCurrency(Number(row.valor_pago))}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-amber-700">
                      {formatCurrency(Number(row.valor_em_aberto))}
                    </td>
                    <td className="px-4 py-2 text-right text-neutral-600">
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
                        className="text-primary-600 hover:underline text-xs font-medium"
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

        {/* Pagination */}
        {!expanded && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goTo(page - 1)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => goTo(p)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    p === page
                      ? "bg-primary-600 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => goTo(page + 1)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {projecao.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-white">Próximos recebimentos (cartão D+30)</h3>
          <p className="text-sm text-white/80">
            Projeção dos próximos 6 meses com base nas parcelas de cartão já registradas.
          </p>
          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <p className="text-sm text-neutral-500">
                {projExpanded ? (
                  <>{projecao.length} registros</>
                ) : (
                  <>
                    {Math.min((projPage - 1) * PAGE_SIZE + 1, projecao.length)}–{Math.min(projPage * PAGE_SIZE, projecao.length)} de {projecao.length} registros
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => { setProjExpanded((v) => !v); setProjPage(1); }}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                {projExpanded ? "Paginar tabela" : "Expandir tudo"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-neutral-700">Mês</th>
                    <th className="px-4 py-2 text-right font-medium text-neutral-700">Total projetado</th>
                    <th className="px-4 py-2 text-right font-medium text-neutral-700">Parcelas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {visibleProjecao.map((row, i) => (
                    <tr key={`${row.mes_recebimento}-${row.clinica_id}-${i}`} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-2 text-neutral-800">
                        {formatMes(String(row.mes_recebimento))}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-neutral-900">
                        {formatCurrency(Number(row.total_projetado))}
                      </td>
                      <td className="px-4 py-2 text-right text-neutral-600">
                        {row.total_parcelas}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!projExpanded && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
                <button
                  type="button"
                  disabled={projPage <= 1}
                  onClick={() => projGoTo(projPage - 1)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: projTotalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => projGoTo(p)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        p === projPage
                          ? "bg-primary-600 text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={projPage >= projTotalPages}
                  onClick={() => projGoTo(projPage + 1)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

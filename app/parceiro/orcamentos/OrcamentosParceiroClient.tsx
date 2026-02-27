"use client";

import { useState, useEffect, useRef } from "react";
import {
  getOrcamentosFechados,
  getOrcamentosAbertos,
  getOrcamentosKpis,
  type OrcamentoFechadoRow,
  type OrcamentoAbertoRow,
  type OrcamentosKpis,
} from "./actions";

const PAGE_SIZE = 50;
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatMonth(mesRef: string): string {
  const [y, m] = mesRef.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

type Tab = "fechados" | "abertos";

type Props = {
  meses: string[];
  initialMes: string;
  initialFechados: OrcamentoFechadoRow[];
  initialAbertos: OrcamentoAbertoRow[];
  initialKpis: OrcamentosKpis;
};

export function OrcamentosParceiroClient({
  meses,
  initialMes,
  initialFechados,
  initialAbertos,
  initialKpis,
}: Props) {
  const [tab, setTab] = useState<Tab>("fechados");
  const [mesRef, setMesRef] = useState(initialMes);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [fechados, setFechados] = useState(initialFechados);
  const [abertos, setAbertos] = useState(initialAbertos);
  const [kpis, setKpis] = useState(initialKpis);
  const [loading, setLoading] = useState(false);

  const [pageFechados, setPageFechados] = useState(1);
  const [pageAbertos, setPageAbertos] = useState(1);
  const [expandedFechados, setExpandedFechados] = useState(false);
  const [expandedAbertos, setExpandedAbertos] = useState(false);

  const firstMount = useRef(true);

  async function load() {
    setLoading(true);
    const [f, a, k] = await Promise.all([
      getOrcamentosFechados(mesRef, statusFilter),
      getOrcamentosAbertos(mesRef),
      getOrcamentosKpis(mesRef),
    ]);
    setFechados(f);
    setAbertos(a);
    setKpis(k);
    setPageFechados(1);
    setPageAbertos(1);
    setLoading(false);
  }

  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    load();
  }, [mesRef, statusFilter]);

  const totalPagesFechados = Math.max(1, Math.ceil(fechados.length / PAGE_SIZE));
  const visibleFechados = expandedFechados
    ? fechados
    : fechados.slice((pageFechados - 1) * PAGE_SIZE, pageFechados * PAGE_SIZE);

  const totalPagesAbertos = Math.max(1, Math.ceil(abertos.length / PAGE_SIZE));
  const visibleAbertos = expandedAbertos
    ? abertos
    : abertos.slice((pageAbertos - 1) * PAGE_SIZE, pageAbertos * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-800">Orçamentos</h2>
        <p className="text-neutral-500 text-sm mt-1">
          Visualize os orçamentos fechados e abertos da sua clínica.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white p-5 shadow-md">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 min-h-[2rem]">
            Orçamentos fechados
          </p>
          <p className="font-heading font-semibold text-neutral-900 text-lg">
            {kpis.totalFechados}
          </p>
          <p className="text-xs text-neutral-500 mt-1">{formatCurrency(kpis.valorTotalFechados)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-md">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 min-h-[2rem]">
            Valor pago
          </p>
          <p className="font-heading font-semibold text-neutral-900 text-lg">
            {formatCurrency(kpis.valorPago)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-md">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 min-h-[2rem]">
            Valor em aberto
          </p>
          <p className="font-heading font-semibold text-amber-700 text-lg">
            {formatCurrency(kpis.valorEmAberto)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-md">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 min-h-[2rem]">
            Pipeline (abertos)
          </p>
          <p className="font-heading font-semibold text-neutral-900 text-lg">
            {kpis.totalAbertos}
          </p>
          <p className="text-xs text-neutral-500 mt-1">{formatCurrency(kpis.valorTotalAbertos)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-700">Mês de referência</span>
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
        {tab === "fechados" && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="em_aberto">Em aberto</option>
              <option value="parcial">Parcial</option>
              <option value="quitado">Quitado</option>
            </select>
          </label>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-neutral-200/60 p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab("fechados")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "fechados"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Fechados ({fechados.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("abertos")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "abertos"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Abertos ({abertos.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-500 text-sm py-8">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Carregando...
        </div>
      ) : tab === "fechados" ? (
        <FechadosTable
          rows={visibleFechados}
          total={fechados.length}
          page={pageFechados}
          totalPages={totalPagesFechados}
          expanded={expandedFechados}
          onPageChange={setPageFechados}
          onToggleExpand={() => { setExpandedFechados((v) => !v); setPageFechados(1); }}
        />
      ) : (
        <AbertosTable
          rows={visibleAbertos}
          total={abertos.length}
          page={pageAbertos}
          totalPages={totalPagesAbertos}
          expanded={expandedAbertos}
          onPageChange={setPageAbertos}
          onToggleExpand={() => { setExpandedAbertos((v) => !v); setPageAbertos(1); }}
        />
      )}
    </div>
  );
}

/* ── Fechados Table ────────────────────────────────────── */

function FechadosTable({
  rows,
  total,
  page,
  totalPages,
  expanded,
  onPageChange,
  onToggleExpand,
}: {
  rows: OrcamentoFechadoRow[];
  total: number;
  page: number;
  totalPages: number;
  expanded: boolean;
  onPageChange: (p: number) => void;
  onToggleExpand: () => void;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
        <p className="text-sm text-neutral-500">
          {expanded ? (
            <>{total} registros</>
          ) : (
            <>
              {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} de {total} registros
            </>
          )}
        </p>
        <button
          type="button"
          onClick={onToggleExpand}
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
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Status</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Data</th>
              <th className="px-4 py-2 text-center font-medium text-neutral-700">Indicação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                  Nenhum orçamento fechado neste período.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-2 text-neutral-900">{row.pacienteNome}</td>
                  <td className="px-4 py-2 text-right text-neutral-700">{formatCurrency(row.valorTotal)}</td>
                  <td className="px-4 py-2 text-right text-neutral-700">{formatCurrency(row.valorPago)}</td>
                  <td className="px-4 py-2 text-right font-medium text-amber-700">
                    {formatCurrency(row.valorEmAberto)}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{formatDate(row.dataFechamento)}</td>
                  <td className="px-4 py-2 text-center">
                    {row.temIndicacao ? (
                      <span className="inline-flex rounded-full bg-primary-600/10 px-2 py-0.5 text-[10px] font-semibold text-primary-600">
                        Sim
                      </span>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!expanded && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  );
}

/* ── Abertos Table ─────────────────────────────────────── */

function AbertosTable({
  rows,
  total,
  page,
  totalPages,
  expanded,
  onPageChange,
  onToggleExpand,
}: {
  rows: OrcamentoAbertoRow[];
  total: number;
  page: number;
  totalPages: number;
  expanded: boolean;
  onPageChange: (p: number) => void;
  onToggleExpand: () => void;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
        <p className="text-sm text-neutral-500">
          {expanded ? (
            <>{total} registros</>
          ) : (
            <>
              {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} de {total} registros
            </>
          )}
        </p>
        <button
          type="button"
          onClick={onToggleExpand}
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
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Status</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-700">Data criação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                  Nenhum orçamento aberto neste período.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-2 text-neutral-900">{row.pacienteNome}</td>
                  <td className="px-4 py-2 text-right text-neutral-700">{formatCurrency(row.valorTotal)}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{formatDate(row.dataCriacao)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!expanded && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  );
}

/* ── Shared Components ─────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    quitado: "bg-green-100 text-green-800",
    parcial: "bg-amber-100 text-amber-800",
    em_aberto: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    quitado: "Quitado",
    parcial: "Parcial",
    em_aberto: "Em aberto",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-neutral-100 text-neutral-700"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Anterior
      </button>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
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
        onClick={() => onPageChange(page + 1)}
        className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Próxima
      </button>
    </div>
  );
}

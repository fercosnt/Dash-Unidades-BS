"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  listInadimplentes,
  getKpisInadimplencia,
  type InadimplenteRow,
  type InadimplenciaFilters,
} from "./actions";
import { getClinicasAtivas } from "../upload/actions";
import { RegistrarPagamentoModal } from "@/components/pagamentos/RegistrarPagamentoModal";

const PAGE_SIZE = 50;

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

export function InadimplenciaClient({
  initialList,
  initialKpis,
  clinicas,
}: {
  initialList: InadimplenteRow[];
  initialKpis: { totalInadimplente: number; quantidadePacientes: number; maiorValor: number; mediaPorPaciente: number };
  clinicas: { id: string; nome: string }[];
}) {
  const [list, setList] = useState(initialList);
  const [kpis, setKpis] = useState(initialKpis);
  const [filters, setFilters] = useState<InadimplenciaFilters>({});
  const [loading, setLoading] = useState(false);
  const [modalRow, setModalRow] = useState<InadimplenteRow | null>(null);
  const [message, setMessage] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const firstMount = useRef(true);

  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const visibleRows = expanded
    ? list
    : list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function goTo(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }

  async function load() {
    setLoading(true);
    const [newList, newKpis] = await Promise.all([
      listInadimplentes(filters),
      getKpisInadimplencia(),
    ]);
    setList(newList);
    setKpis(newKpis);
    setPage(1);
    setLoading(false);
  }

  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    load();
  }, [filters.clinica_id, filters.valor_min, filters.dias_min, filters.status]);

  async function handleSuccess() {
    setModalRow(null);
    setMessage({ tipo: "ok", texto: "Pagamento registrado. Lista atualizada." });
    setTimeout(() => setMessage(null), 4000);
    await load();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Inadimplência</h2>

      {message && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm ${
            message.tipo === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.texto}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-500">Total inadimplente</p>
          <p className="text-xl font-bold text-neutral-900">{formatCurrency(kpis.totalInadimplente)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-500">Pacientes inadimplentes</p>
          <p className="text-xl font-bold text-neutral-900">{kpis.quantidadePacientes}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-500">Maior valor em aberto</p>
          <p className="text-xl font-bold text-neutral-900">{formatCurrency(kpis.maiorValor)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-500">Média por paciente</p>
          <p className="text-xl font-bold text-neutral-900">{formatCurrency(kpis.mediaPorPaciente)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-white/80">Clínica</span>
          <select
            value={filters.clinica_id ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, clinica_id: e.target.value || undefined }))}
            className="w-44 rounded-md border border-neutral-300 px-3 py-2 text-sm select-arrow-inset"
          >
            <option value="">Todas</option>
            {clinicas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-white/80">Valor mínimo (R$)</span>
          <select
            value={filters.valor_min ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                valor_min: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            className="w-44 rounded-md border border-neutral-300 px-3 py-2 text-sm select-arrow-inset"
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
            value={filters.dias_min ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                dias_min: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            className="w-44 rounded-md border border-neutral-300 px-3 py-2 text-sm select-arrow-inset"
          >
            <option value="">Qualquer</option>
            <option value="30">&gt; 30 dias</option>
            <option value="60">&gt; 60 dias</option>
            <option value="90">&gt; 90 dias</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-white/80">Status</span>
          <select
            value={filters.status ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: e.target.value ? (e.target.value as "em_aberto" | "parcial") : undefined,
              }))
            }
            className="w-44 rounded-md border border-neutral-300 px-3 py-2 text-sm select-arrow-inset"
          >
            <option value="">Todos</option>
            <option value="em_aberto">Em aberto</option>
            <option value="parcial">Parcial</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="flex h-40 w-full items-center justify-center text-sm text-white">
          Carregando...
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
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
                  <th className="px-4 py-2 text-left font-medium text-neutral-700">Clínica</th>
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
                    <td colSpan={9} className="px-4 py-6 text-center text-neutral-500">
                      Nenhum inadimplente no momento.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => (
                    <tr key={row.orcamento_fechado_id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-2 text-neutral-900">{row.paciente_nome}</td>
                      <td className="px-4 py-2 text-neutral-700">{row.clinica_nome}</td>
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
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/inadimplencia/${row.orcamento_fechado_id}`}
                            className="text-primary-600 hover:underline text-xs font-medium"
                          >
                            Ver detalhes
                          </Link>
                          <button
                            type="button"
                            onClick={() => setModalRow(row)}
                            className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                          >
                            Registrar pagamento
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
      )}

      {modalRow && (
        <RegistrarPagamentoModal
          orcamentoId={modalRow.orcamento_fechado_id}
          pacienteNome={modalRow.paciente_nome}
          valorTotal={Number(modalRow.valor_total)}
          valorEmAberto={Number(modalRow.valor_em_aberto)}
          clinicaId={modalRow.clinica_id}
          onSuccess={handleSuccess}
          onClose={() => setModalRow(null)}
        />
      )}
    </div>
  );
}

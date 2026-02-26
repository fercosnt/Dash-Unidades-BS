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

  async function load() {
    setLoading(true);
    const [newList, newKpis] = await Promise.all([
      listInadimplentes(filters),
      getKpisInadimplencia(),
    ]);
    setList(newList);
    setKpis(newKpis);
    setLoading(false);
  }

  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    load();
  }, [filters.clinica_id, filters.valor_min, filters.dias_min]);

  async function handleSuccess() {
    setModalRow(null);
    setMessage({ tipo: "ok", texto: "Pagamento registrado. Lista atualizada." });
    setTimeout(() => setMessage(null), 4000);
    await load();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#0A2463]">Inadimplência</h2>

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

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Clínica</span>
          <select
            value={filters.clinica_id ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, clinica_id: e.target.value || undefined }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {clinicas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Valor mínimo (R$)</span>
          <select
            value={filters.valor_min ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                valor_min: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Qualquer</option>
            <option value="1000">&gt; R$ 1.000</option>
            <option value="5000">&gt; R$ 5.000</option>
            <option value="10000">&gt; R$ 10.000</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Dias em aberto</span>
          <select
            value={filters.dias_min ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                dias_min: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Qualquer</option>
            <option value="30">&gt; 30 dias</option>
            <option value="60">&gt; 60 dias</option>
            <option value="90">&gt; 90 dias</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-700">Paciente</th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">Clínica</th>
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
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                    Nenhum inadimplente no momento.
                  </td>
                </tr>
              ) : (
                list.map((row) => (
                  <tr key={row.orcamento_fechado_id}>
                    <td className="px-4 py-2 text-slate-900">{row.paciente_nome}</td>
                    <td className="px-4 py-2 text-slate-700">{row.clinica_nome}</td>
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
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/inadimplencia/${row.orcamento_fechado_id}`}
                          className="text-[#0A2463] hover:underline text-xs font-medium"
                        >
                          Ver detalhes
                        </Link>
                        <button
                          type="button"
                          onClick={() => setModalRow(row)}
                          className="rounded-md bg-[#0A2463] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
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

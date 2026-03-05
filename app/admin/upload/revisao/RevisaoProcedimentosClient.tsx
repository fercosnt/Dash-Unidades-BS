"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { matchProcedimentoPorNome } from "@/lib/utils/match-procedimento";
import {
  listTratamentosSemProcedimento,
  getProcedimentosAtivos,
  vincularProcedimento,
  vincularProcedimentoBulk,
  criarProcedimentoRapido,
  vincularAutomaticamente,
  type TratamentoPendenteRow,
  type ProcedimentoOption,
  type RevisaoFilters,
} from "./actions";

type Props = {
  initialTratamentos: TratamentoPendenteRow[];
  procedimentos: ProcedimentoOption[];
  clinicas: { id: string; nome: string }[];
};

function formatMonthRef(iso: string) {
  const [y, m] = iso.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[Number(m) - 1]}/${y}`;
}

export function RevisaoProcedimentosClient({
  initialTratamentos,
  procedimentos: initialProcedimentos,
  clinicas,
}: Props) {
  const [tratamentos, setTratamentos] = useState<TratamentoPendenteRow[]>(initialTratamentos);
  const [procedimentos, setProcedimentos] = useState<ProcedimentoOption[]>(initialProcedimentos);
  const [filters, setFilters] = useState<RevisaoFilters>({});
  const [loading, setLoading] = useState(false);
  const [modalTratamento, setModalTratamento] = useState<TratamentoPendenteRow | null>(null);
  const [selectedProcedimentoId, setSelectedProcedimentoId] = useState("");
  const [showCriarNovo, setShowCriarNovo] = useState(false);
  const [novoProcedimentoNome, setNovoProcedimentoNome] = useState("");
  const [criando, setCriando] = useState(false);
  const [vinculando, setVinculando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [autoLinking, setAutoLinking] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkProcedimentoId, setBulkProcedimentoId] = useState("");
  const [bulkVinculando, setBulkVinculando] = useState(false);

  const hasFilters = filters.clinica_id != null || filters.mes != null;

  const totalPendentes = useMemo(
    () => tratamentos.reduce((acc, t) => acc + (t.quantidade ?? 1), 0),
    [tratamentos],
  );

  const kpiCostData = useMemo(() => {
    if (tratamentos.length === 0 || procedimentos.length === 0) return [];

    const matches = procedimentos.map((p) => ({ id: p.id, nome: p.nome }));
    const custoPorId = new Map<string, number>(
      procedimentos.map((p) => [p.id, Number(p.custo_fixo ?? 0)]),
    );

    const agg = new Map<string, { clinica_nome: string; custo: number }>();

    for (const t of tratamentos) {
      const nome = t.procedimento_nome ?? "";
      const matched = matchProcedimentoPorNome(nome, matches);
      if (!matched) continue;
      const custoUnitario = custoPorId.get(matched.id) ?? 0;
      if (!custoUnitario) continue;

      const key = t.clinica_id;
      const existing = agg.get(key) ?? { clinica_nome: t.clinica_nome, custo: 0 };
      existing.custo += custoUnitario * (t.quantidade ?? 1);
      agg.set(key, existing);
    }

    return Array.from(agg.values())
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 8);
  }, [tratamentos, procedimentos]);

  const totalCusto = useMemo(
    () => kpiCostData.reduce((sum, item) => sum + item.custo, 0),
    [kpiCostData],
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value || 0);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === tratamentos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tratamentos.map((t) => t.id)));
    }
  }

  function selectByProcName(name: string) {
    const ids = tratamentos.filter((t) => t.procedimento_nome === name).map((t) => t.id);
    setSelectedIds(new Set(ids));
  }

  async function handleBulkVincular() {
    if (!bulkProcedimentoId || selectedIds.size === 0) return;
    setBulkVinculando(true);
    setMensagem(null);
    const result = await vincularProcedimentoBulk(Array.from(selectedIds), bulkProcedimentoId);
    setBulkVinculando(false);
    if (result.ok) {
      setTratamentos((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
      setShowBulkModal(false);
      setBulkProcedimentoId("");
      setMensagem({ tipo: "ok", texto: `${result.vinculados} tratamento(s) vinculado(s) em lote.` });
      setTimeout(() => setMensagem(null), 4000);
    } else {
      setMensagem({ tipo: "erro", texto: result.error ?? "Erro ao vincular em lote." });
    }
  }

  async function carregar() {
    setLoading(true);
    const list = await listTratamentosSemProcedimento(filters);
    setTratamentos(list);
    setLoading(false);
  }

  useEffect(() => {
    if (!hasFilters) return;
    carregar();
  }, [filters.clinica_id, filters.mes]);

  async function handleVincular() {
    if (!modalTratamento || !selectedProcedimentoId) return;
    setVinculando(true);
    setMensagem(null);
    const result = await vincularProcedimento(modalTratamento.id, selectedProcedimentoId);
    setVinculando(false);
    if (result.ok) {
      setTratamentos((prev) => prev.filter((t) => t.id !== modalTratamento.id));
      setModalTratamento(null);
      setSelectedProcedimentoId("");
      setMensagem({ tipo: "ok", texto: "Procedimento vinculado." });
      setTimeout(() => setMensagem(null), 3000);
    } else {
      setMensagem({ tipo: "erro", texto: result.error ?? "Erro ao vincular." });
    }
  }

  async function handleCriarNovo() {
    const nome = novoProcedimentoNome.trim();
    if (!nome) return;
    setCriando(true);
    const result = await criarProcedimentoRapido(nome);
    setCriando(false);
    if ("error" in result) {
      setMensagem({ tipo: "erro", texto: result.error });
      return;
    }
    const novo: ProcedimentoOption = { id: result.id, nome };
    setProcedimentos((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
    setSelectedProcedimentoId(result.id);
    setNovoProcedimentoNome("");
    setShowCriarNovo(false);
    setMensagem({ tipo: "ok", texto: "Procedimento criado. Confirme a vinculação." });
    setTimeout(() => setMensagem(null), 3000);
  }

  function abrirModal(row: TratamentoPendenteRow) {
    setModalTratamento(row);
    setSelectedProcedimentoId("");
    setShowCriarNovo(false);
    setNovoProcedimentoNome("");
    setMensagem(null);
  }

  async function handleVincularAutomaticamente() {
    setAutoLinking(true);
    setMensagem(null);
    const result = await vincularAutomaticamente(filters);
    setAutoLinking(false);
    if (result.error) {
      setMensagem({ tipo: "erro", texto: result.error });
      return;
    }
    if (result.vinculados > 0 || result.restantes === 0) {
      await carregar();
    }
    if (result.vinculados > 0 && result.restantes > 0) {
      setMensagem({
        tipo: "ok",
        texto: `${result.vinculados} vinculado(s) automaticamente. ${result.restantes} restante(s) para vincular manualmente.`,
      });
    } else if (result.vinculados > 0) {
      setMensagem({ tipo: "ok", texto: `Todos os ${result.vinculados} tratamento(s) foram vinculados automaticamente.` });
    } else if (result.restantes > 0) {
      setMensagem({
        tipo: "erro",
        texto: `Nenhum vínculo automático encontrado. ${result.restantes} tratamento(s) restante(s) — vincule manualmente pela tabela abaixo.`,
      });
    } else {
      setMensagem({ tipo: "ok", texto: "Nenhum tratamento pendente para vincular." });
    }
    setTimeout(() => setMensagem(null), 6000);
  }

  return (
    <div className="space-y-4">
      {mensagem && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm ${
            mensagem.tipo === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-white/80">Clínica</span>
            <select
              value={filters.clinica_id ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, clinica_id: e.target.value || undefined }))}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {clinicas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-white/80">Mês</span>
            <input
              type="month"
              value={filters.mes ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, mes: e.target.value || undefined }))}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleVincularAutomaticamente}
            disabled={autoLinking || tratamentos.length === 0}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {autoLinking ? "Vinculando..." : "Vincular automaticamente"}
          </button>
          <Link
            href="/admin/upload/historico"
            className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            Editar planilha e valores
          </Link>
        </div>
      </div>

      {tratamentos.length > 0 && (
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="rounded-lg bg-white p-4 shadow-md">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900">KPIs de custos pendentes</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between">
                <dt className="text-neutral-600">Custo fixo estimado pendente</dt>
                <dd className="font-semibold text-neutral-900">{formatCurrency(totalCusto)}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-neutral-600">Tratamentos pendentes</dt>
                <dd className="font-semibold text-neutral-900">{totalPendentes}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-neutral-600">Clínicas impactadas</dt>
                <dd className="font-semibold text-neutral-900">{kpiCostData.length}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-neutral-500">
              Os valores consideram apenas tratamentos cujo nome bate com um procedimento cadastrado com custo fixo.
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-md">
            <h3 className="mb-3 text-sm font-heading font-bold text-neutral-900">
              Custo estimado pendente por clínica
            </h3>
            <div className="h-56">
              {kpiCostData.length === 0 ? (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-neutral-500">
                  Nenhum custo estimado. Ajuste os filtros ou cadastre custos fixos nos procedimentos.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={kpiCostData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E9E8" />
                    <XAxis
                      dataKey="clinica_nome"
                      tick={{ fontSize: 11, fill: "#6B6D70" }}
                      tickLine={false}
                      axisLine={{ stroke: "#E8E9E8" }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis
                      tickFormatter={(v) => (v >= 1000 ? `${Math.round((Number(v) as number) / 1000)}k` : String(v))}
                      tick={{ fontSize: 11, fill: "#6B6D70" }}
                      tickLine={false}
                      axisLine={{ stroke: "#E8E9E8" }}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => String(label)}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #E8E9E8",
                        boxShadow: "0 4px 6px -1px rgba(45,46,48,0.1)",
                      }}
                      cursor={{ fill: "#E5E7EB", opacity: 0.5 }}
                    />
                    <Bar dataKey="custo" name="Custo estimado" fill="#35BFAD" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-sm font-medium text-neutral-900">
            {selectedIds.size} selecionado(s)
          </span>
          <button
            type="button"
            onClick={() => { setShowBulkModal(true); setBulkProcedimentoId(""); }}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Vincular selecionados
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
            Limpar seleção
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 w-full items-center justify-center text-sm text-white">
          Carregando...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 w-10">
                  <input
                    type="checkbox"
                    checked={tratamentos.length > 0 && selectedIds.size === tratamentos.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600/20"
                  />
                </th>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Clínica</th>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Mês</th>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Paciente</th>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Procedimento (planilha)</th>
                <th className="px-4 py-2 text-right font-medium text-neutral-700">Qtd</th>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Data</th>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {tratamentos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-neutral-500">
                    Nenhum tratamento pendente de revisão.
                  </td>
                </tr>
              ) : (
                tratamentos.map((row) => (
                  <tr key={row.id} className={`hover:bg-neutral-50 transition-colors ${selectedIds.has(row.id) ? "bg-primary-600/[0.03]" : ""}`}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600/20"
                      />
                    </td>
                    <td className="px-4 py-2 text-neutral-900">{row.clinica_nome}</td>
                    <td className="px-4 py-2 text-neutral-700">{formatMonthRef(row.mes_referencia)}</td>
                    <td className="px-4 py-2 text-neutral-900">{row.paciente_nome}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => selectByProcName(row.procedimento_nome ?? "")}
                        className="text-neutral-700 hover:text-primary-600 hover:underline text-left"
                        title="Clique para selecionar todos com este nome"
                      >
                        {row.procedimento_nome ?? "—"}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right text-neutral-700">{row.quantidade}</td>
                    <td className="px-4 py-2 text-neutral-600">{row.data_execucao ?? "—"}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => abrirModal(row)}
                        className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                      >
                        Vincular
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalTratamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !vinculando && setModalTratamento(null)}>
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">Vincular procedimento</h3>
            <p className="text-sm text-neutral-600 mb-4">
              {modalTratamento.paciente_nome} · {modalTratamento.procedimento_nome ?? "(sem nome)"}
            </p>
            {!showCriarNovo ? (
              <>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Procedimento cadastrado</label>
                <select
                  value={selectedProcedimentoId}
                  onChange={(e) => setSelectedProcedimentoId(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm mb-4"
                >
                  <option value="">Selecione...</option>
                  {procedimentos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCriarNovo(true)}
                  className="text-sm text-primary-600 hover:underline mb-4 block"
                >
                  + Criar novo procedimento
                </button>
              </>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Nome do novo procedimento</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novoProcedimentoNome}
                    onChange={(e) => setNovoProcedimentoNome(e.target.value)}
                    placeholder="Ex.: Clareamento dental"
                    className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleCriarNovo}
                    disabled={criando || !novoProcedimentoNome.trim()}
                    className="rounded-md bg-neutral-600 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                  >
                    {criando ? "Criando..." : "Criar"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowCriarNovo(false); setNovoProcedimentoNome(""); }}
                  className="text-sm text-neutral-500 hover:underline mt-2"
                >
                  Cancelar (voltar à lista)
                </button>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalTratamento(null)}
                disabled={vinculando}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleVincular}
                disabled={vinculando || !selectedProcedimentoId}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {vinculando ? "Vinculando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !bulkVinculando && setShowBulkModal(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">Vincular em lote</h3>
            <p className="text-sm text-neutral-600 mb-4">
              {selectedIds.size} tratamento(s) selecionado(s) serão vinculados ao mesmo procedimento.
            </p>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Procedimento cadastrado</label>
            <select
              value={bulkProcedimentoId}
              onChange={(e) => setBulkProcedimentoId(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm mb-4"
            >
              <option value="">Selecione...</option>
              {procedimentos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                disabled={bulkVinculando}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkVincular}
                disabled={bulkVinculando || !bulkProcedimentoId}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {bulkVinculando ? "Vinculando..." : `Vincular ${selectedIds.size} tratamento(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

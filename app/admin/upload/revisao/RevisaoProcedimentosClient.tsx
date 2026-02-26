"use client";

import { useState, useEffect } from "react";
import {
  listTratamentosSemProcedimento,
  getProcedimentosAtivos,
  vincularProcedimento,
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

  const hasFilters = filters.clinica_id != null || filters.mes != null;

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
          <span className="text-sm font-medium text-slate-700">Mês</span>
          <input
            type="month"
            value={filters.mes ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, mes: e.target.value || undefined }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={handleVincularAutomaticamente}
          disabled={autoLinking || tratamentos.length === 0}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {autoLinking ? "Vinculando..." : "Vincular automaticamente"}
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-700">Clínica</th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">Mês</th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">Paciente</th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">Procedimento (planilha)</th>
                <th className="px-4 py-2 text-right font-medium text-slate-700">Qtd</th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">Data</th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {tratamentos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Nenhum tratamento pendente de revisão.
                  </td>
                </tr>
              ) : (
                tratamentos.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2 text-slate-900">{row.clinica_nome}</td>
                    <td className="px-4 py-2 text-slate-700">{formatMonthRef(row.mes_referencia)}</td>
                    <td className="px-4 py-2 text-slate-900">{row.paciente_nome}</td>
                    <td className="px-4 py-2 text-slate-700">{row.procedimento_nome ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-slate-700">{row.quantidade}</td>
                    <td className="px-4 py-2 text-slate-600">{row.data_execucao ?? "—"}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => abrirModal(row)}
                        className="rounded-md bg-[#0A2463] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
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
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Vincular procedimento</h3>
            <p className="text-sm text-slate-600 mb-4">
              {modalTratamento.paciente_nome} · {modalTratamento.procedimento_nome ?? "(sem nome)"}
            </p>
            {!showCriarNovo ? (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-2">Procedimento cadastrado</label>
                <select
                  value={selectedProcedimentoId}
                  onChange={(e) => setSelectedProcedimentoId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm mb-4"
                >
                  <option value="">Selecione...</option>
                  {procedimentos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCriarNovo(true)}
                  className="text-sm text-[#0A2463] hover:underline mb-4 block"
                >
                  + Criar novo procedimento
                </button>
              </>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Nome do novo procedimento</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novoProcedimentoNome}
                    onChange={(e) => setNovoProcedimentoNome(e.target.value)}
                    placeholder="Ex.: Clareamento dental"
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleCriarNovo}
                    disabled={criando || !novoProcedimentoNome.trim()}
                    className="rounded-md bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {criando ? "Criando..." : "Criar"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowCriarNovo(false); setNovoProcedimentoNome(""); }}
                  className="text-sm text-slate-500 hover:underline mt-2"
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
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleVincular}
                disabled={vinculando || !selectedProcedimentoId}
                className="rounded-md bg-[#0A2463] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {vinculando ? "Vinculando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

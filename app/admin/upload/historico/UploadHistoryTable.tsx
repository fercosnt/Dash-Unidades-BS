"use client";

import { useState, useEffect } from "react";
import {
  listUploadBatches,
  getBatchDetail,
  updateUploadBatchMonth,
  deleteUploadBatch,
  updateBatchRecord,
  createBatchRecord,
  deleteBatchRecord,
  type UploadBatchRow,
  type HistoricoFilters,
  type BatchDetail,
} from "../actions";
import { UploadDetailModal } from "./UploadDetailModal";

const TIPO_LABELS: Record<string, string> = {
  orcamentos_fechados: "Orçamentos fechados",
  orcamentos_abertos: "Orçamentos abertos",
  tratamentos_executados: "Tratamentos executados",
};

const STATUS_LABELS: Record<string, string> = {
  processando: "Processando",
  concluido: "Concluído",
  erro: "Erro",
};

export function UploadHistoryTable({ initialBatches, clinicas }: { initialBatches: UploadBatchRow[]; clinicas: { id: string; nome: string }[] }) {
  const [batches, setBatches] = useState<UploadBatchRow[]>(initialBatches);
  const [filters, setFilters] = useState<HistoricoFilters>({});
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function applyFilters() {
    setLoading(true);
    const list = await listUploadBatches(filters);
    setBatches(list);
    setLoading(false);
  }

  const hasFilters = filters.clinica_id != null || filters.mes != null || filters.tipo != null || filters.status != null;
  useEffect(() => {
    if (!hasFilters) return;
    applyFilters();
  }, [filters.clinica_id, filters.mes, filters.tipo, filters.status]);

  async function handleUpdateMonth(batchId: string, newMonth: string) {
    setDetailLoading(true);
    const result = await updateUploadBatchMonth(batchId, newMonth);
    setDetailLoading(false);
    if (!result.ok) {
      if (typeof window !== "undefined") {
        window.alert(result.error ?? "Erro ao atualizar o mês do upload.");
      }
      return;
    }
    await applyFilters();
    const d = await getBatchDetail(batchId);
    setDetail(d);
  }

  async function handleDeleteBatch(batchId: string) {
    setDetailLoading(true);
    const result = await deleteUploadBatch(batchId);
    setDetailLoading(false);
    if (!result.ok) {
      if (typeof window !== "undefined") {
        window.alert(result.error ?? "Erro ao excluir o upload.");
      }
      return;
    }
    setDetail(null);
    await applyFilters();
  }

  async function handleSaveRecord(
    batchId: string,
    tipo: string,
    recordId: string,
    payload: { paciente_nome?: string; valor_total?: number },
  ) {
    const result = await updateBatchRecord({
      batchId,
      tipo: tipo as "orcamentos_fechados" | "orcamentos_abertos" | "tratamentos_executados",
      id: recordId,
      ...payload,
    });
    if (!result.ok && typeof window !== "undefined") {
      window.alert(result.error ?? "Erro ao salvar registro.");
    } else if (detail && detail.batch.id === batchId) {
      const d = await getBatchDetail(batchId);
      setDetail(d);
    }
  }

  async function handleAddRecord(
    batchId: string,
    tipo: string,
    payload: { paciente_nome: string; valor_total?: number },
  ) {
    const result = await createBatchRecord({
      batchId,
      tipo: tipo as "orcamentos_fechados" | "orcamentos_abertos" | "tratamentos_executados",
      ...payload,
    });
    if (!result.ok && typeof window !== "undefined") {
      window.alert(result.error ?? "Erro ao adicionar registro.");
    } else if (detail && detail.batch.id === batchId) {
      const d = await getBatchDetail(batchId);
      setDetail(d);
      await applyFilters();
    }
  }

  async function handleDeleteRecord(batchId: string, tipo: string, recordId: string) {
    const result = await deleteBatchRecord(
      batchId,
      tipo as "orcamentos_fechados" | "orcamentos_abertos" | "tratamentos_executados",
      recordId,
    );
    if (!result.ok && typeof window !== "undefined") {
      window.alert(result.error ?? "Erro ao excluir registro.");
    } else if (detail && detail.batch.id === batchId) {
      const d = await getBatchDetail(batchId);
      setDetail(d);
      await applyFilters();
    }
  }

  async function handleRowClick(batchId: string) {
    setDetailLoading(true);
    setDetail(null);
    const d = await getBatchDetail(batchId);
    setDetail(d);
    setDetailLoading(false);
  }

  function formatMonthRef(iso: string) {
    const [y, m] = iso.split("-");
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${months[Number(m) - 1]}/${y}`;
  }

  function formatDateTime(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return iso;
    }
  }

  return (
    <div className="space-y-4">
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
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-white/80">Tipo</span>
          <select
            value={filters.tipo ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, tipo: e.target.value || undefined }))}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="orcamentos_fechados">Orçamentos fechados</option>
            <option value="orcamentos_abertos">Orçamentos abertos</option>
            <option value="tratamentos_executados">Tratamentos executados</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-white/80">Status</span>
          <select
            value={filters.status ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="processando">Processando</option>
            <option value="concluido">Concluído</option>
            <option value="erro">Erro</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="flex h-40 w-full items-center justify-center text-sm text-white">
          Carregando...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Clínica</th>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Mês</th>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Tipo</th>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Arquivo</th>
                <th className="px-4 py-2 text-right font-medium text-neutral-700">Registros</th>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Status</th>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Enviado em</th>
                <th className="px-4 py-2 text-left font-medium text-neutral-700">Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-neutral-500">
                    Nenhum upload encontrado.
                  </td>
                </tr>
              ) : (
                batches.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => handleRowClick(row.id)}
                    className="cursor-pointer hover:bg-neutral-50"
                  >
                    <td className="px-4 py-2 text-neutral-900">{row.clinica_nome}</td>
                    <td className="px-4 py-2 text-neutral-700">{formatMonthRef(row.mes_referencia)}</td>
                    <td className="px-4 py-2 text-neutral-700">{TIPO_LABELS[row.tipo] ?? row.tipo}</td>
                    <td className="px-4 py-2 text-neutral-600 max-w-[180px] truncate" title={row.arquivo_nome ?? ""}>
                      {row.arquivo_nome ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-neutral-700">{row.total_registros}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          row.status === "concluido"
                            ? "text-green-700"
                            : row.status === "erro"
                              ? "text-red-700"
                              : "text-amber-700"
                        }
                      >
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-neutral-600">{formatDateTime(row.uploaded_at)}</td>
                    <td className="px-4 py-2 text-neutral-600">{row.uploader_nome ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <p className="rounded-lg bg-white px-4 py-2 text-neutral-700">Carregando detalhes...</p>
        </div>
      )}

      {detail && !detailLoading && (
        <UploadDetailModal
          detail={detail}
          onClose={() => setDetail(null)}
          formatMonthRef={formatMonthRef}
          formatDateTime={formatDateTime}
          onChangeMonth={handleUpdateMonth}
          onDelete={handleDeleteBatch}
          onSaveRecord={handleSaveRecord}
          onAddRecord={handleAddRecord}
          onDeleteRecord={handleDeleteRecord}
        />
      )}
    </div>
  );
}

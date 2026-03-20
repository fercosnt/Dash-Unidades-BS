"use client";

import { useEffect, useState } from "react";
import type { BatchDetail } from "../actions";

const TIPO_LABELS: Record<string, string> = {
  orcamentos_fechados: "Orçamentos fechados",
  orcamentos_abertos: "Orçamentos abertos",
  tratamentos_executados: "Tratamentos executados",
};

type Props = {
  detail: BatchDetail;
  onClose: () => void;
  formatMonthRef: (iso: string) => string;
  formatDateTime: (iso: string) => string;
  onChangeMonth: (batchId: string, newMonth: string) => Promise<void> | void;
  onDelete: (batchId: string) => Promise<void> | void;
  onSaveRecord: (
    batchId: string,
    tipo: string,
    recordId: string,
    payload: { paciente_nome?: string; valor_total?: number },
  ) => Promise<void> | void;
  onAddRecord: (
    batchId: string,
    tipo: string,
    payload: { paciente_nome: string; valor_total?: number },
  ) => Promise<void> | void;
  onDeleteRecord: (batchId: string, tipo: string, recordId: string) => Promise<void> | void;
};

export function UploadDetailModal({
  detail,
  onClose,
  formatMonthRef,
  formatDateTime,
  onChangeMonth,
  onDelete,
  onSaveRecord,
  onAddRecord,
  onDeleteRecord,
}: Props) {
  const { batch, registros, total } = detail;
  const tipo = batch.tipo;

  const [editMonth, setEditMonth] = useState(batch.mes_referencia);
  const [savingMonth, setSavingMonth] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rows, setRows] = useState(registros);
  const [editing, setEditing] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [newPaciente, setNewPaciente] = useState("");
  const [newValor, setNewValor] = useState<string>("");
  const [addingRow, setAddingRow] = useState(false);

  const isOrcamento = tipo === "orcamentos_fechados" || tipo === "orcamentos_abertos";

  useEffect(() => {
    setEditMonth(batch.mes_referencia);
    setSavingMonth(false);
    setDeleting(false);
    setRows(registros);
    setEditing(false);
    setSavingRowId(null);
    setNewPaciente("");
    setNewValor("");
    setAddingRow(false);
  }, [batch.mes_referencia, registros]);

  async function handleSubmitMonth(e: React.FormEvent) {
    e.preventDefault();
    if (!editMonth) return;
    setSavingMonth(true);
    try {
      await onChangeMonth(batch.id, editMonth);
    } finally {
      setSavingMonth(false);
    }
  }

  function handleLocalChange(id: string, field: "paciente_nome" | "valor_total", value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              [field]: field === "valor_total" ? (value === "" ? undefined : Number(value)) : value,
            }
          : r,
      ),
    );
  }

  async function handleSaveRow(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setSavingRowId(id);
    try {
      await onSaveRecord(batch.id, tipo, id, {
        paciente_nome: row.paciente_nome,
        valor_total: row.valor_total,
      });
    } finally {
      setSavingRowId(null);
    }
  }

  async function handleAddRow(e: React.FormEvent) {
    e.preventDefault();
    if (!newPaciente.trim()) return;
    setAddingRow(true);
    try {
      await onAddRecord(batch.id, tipo, {
        paciente_nome: newPaciente.trim(),
        valor_total: newValor ? Number(newValor) : undefined,
      });
      setNewPaciente("");
      setNewValor("");
    } finally {
      setAddingRow(false);
    }
  }

  async function handleDeleteRow(id: string) {
    await onDeleteRecord(batch.id, tipo, id);
  }

  async function handleDeleteClick() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Tem certeza que deseja excluir este upload? Todos os registros vinculados a este batch também serão removidos.",
      );
      if (!confirmed) return;
    }
    setDeleting(true);
    try {
      await onDelete(batch.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-neutral-200 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">
              Detalhe do upload — {batch.clinica_nome} · {formatMonthRef(batch.mes_referencia)}
            </h3>
            <p className="text-sm text-neutral-600 mt-1">
              {TIPO_LABELS[tipo] ?? tipo} · {batch.total_registros} registros · {formatDateTime(batch.uploaded_at)}
              {batch.arquivo_nome && ` · ${batch.arquivo_nome}`}
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <form onSubmit={handleSubmitMonth} className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-xs text-neutral-600">
                  <span>Mês de referência</span>
                  <input
                    type="month"
                    value={editMonth}
                    onChange={(e) => setEditMonth(e.target.value)}
                    className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900"
                  />
                </label>
                <button
                  type="submit"
                  disabled={savingMonth || !editMonth}
                  className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {savingMonth ? "Salvando..." : "Salvar mês"}
                </button>
              </form>
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleting}
                className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {deleting ? "Excluindo..." : "Excluir upload"}
              </button>
              {isOrcamento && (
                <button
                  type="button"
                  onClick={() => setEditing((prev) => !prev)}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  {editing ? "Fechar edição de valores" : "Editar valores (nomes, valor, pacientes)"}
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1">
          <p className="text-sm text-neutral-500 mb-2">
            Exibindo até 100 de {total} registros.
          </p>
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-neutral-700">Paciente</th>
                  {(tipo === "orcamentos_fechados" || tipo === "orcamentos_abertos") && (
                    <th className="px-3 py-2 text-right font-medium text-neutral-700">Valor</th>
                  )}
                  {tipo === "orcamentos_fechados" && (
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">Data fechamento</th>
                  )}
                  {tipo === "tratamentos_executados" && (
                    <>
                      <th className="px-3 py-2 text-left font-medium text-neutral-700">Procedimento (planilha)</th>
                      <th className="px-3 py-2 text-left font-medium text-neutral-700">Vínculo</th>
                      <th className="px-3 py-2 text-left font-medium text-neutral-700">Categoria</th>
                      <th className="px-3 py-2 text-right font-medium text-neutral-700">Qtd</th>
                      <th className="px-3 py-2 text-left font-medium text-neutral-700">Data execução</th>
                    </>
                  )}
                  {isOrcamento && editing && (
                    <th className="px-3 py-2 text-right font-medium text-neutral-700">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-neutral-900">
                      {isOrcamento && editing ? (
                        <input
                          type="text"
                          value={r.paciente_nome ?? ""}
                          onChange={(e) => handleLocalChange(r.id, "paciente_nome", e.target.value)}
                          className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900"
                        />
                      ) : (
                        r.paciente_nome ?? "—"
                      )}
                    </td>
                    {(tipo === "orcamentos_fechados" || tipo === "orcamentos_abertos") && (
                      <td className="px-3 py-2 text-right text-neutral-700">
                        {isOrcamento && editing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={r.valor_total != null ? String(r.valor_total) : ""}
                            onChange={(e) => handleLocalChange(r.id, "valor_total", e.target.value)}
                            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900 text-right"
                          />
                        ) : r.valor_total != null ? (
                          `R$ ${Number(r.valor_total).toLocaleString("pt-BR")}`
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                    {tipo === "orcamentos_fechados" && (
                      <td className="px-3 py-2 text-neutral-600">{r.data_fechamento ?? "—"}</td>
                    )}
                    {tipo === "tratamentos_executados" && (
                      <>
                        <td className="px-3 py-2 text-neutral-700">{r.procedimento_nome ?? "—"}</td>
                        <td className="px-3 py-2 text-neutral-700">
                          {r.procedimento_vinculado ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                              {r.procedimento_vinculado}
                            </span>
                          ) : (
                            <span className="text-amber-600 text-xs">Não vinculado</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-neutral-500 text-xs">{r.procedimento_categoria ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-neutral-700">{r.quantidade ?? "—"}</td>
                        <td className="px-3 py-2 text-neutral-600">{r.data_execucao ?? "—"}</td>
                      </>
                    )}
                    {isOrcamento && editing && (
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleSaveRow(r.id)}
                          disabled={savingRowId === r.id}
                          className="mr-2 rounded-md bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {savingRowId === r.id ? "Salvando..." : "Salvar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(r.id)}
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          Remover
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {isOrcamento && editing && (
                  <tr>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={newPaciente}
                        onChange={(e) => setNewPaciente(e.target.value)}
                        placeholder="Novo paciente"
                        className="w-full rounded-md border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-900"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={newValor}
                        onChange={(e) => setNewValor(e.target.value)}
                        placeholder="Valor"
                        className="w-full rounded-md border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-900 text-right"
                      />
                    </td>
                    {tipo === "orcamentos_fechados" && <td />}
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={handleAddRow}
                        disabled={addingRow || !newPaciente.trim()}
                        className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {addingRow ? "Adicionando..." : "Adicionar paciente"}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

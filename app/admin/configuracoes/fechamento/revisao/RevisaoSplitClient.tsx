"use client";

import { useState } from "react";
import Link from "next/link";
import {
  fetchSplitReview,
  updateItemOrcamento,
  removeItemOrcamento,
  resplitOrcamento,
  type OrcamentoReviewRow,
  type ItemOrcamentoRow,
} from "../split-actions";
import { type ProcedimentoRow } from "../../procedimentos/actions";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

type Props = {
  mesReferencia: string;
  initialOrcamentos: OrcamentoReviewRow[];
  procedimentos: ProcedimentoRow[];
  categorias: string[];
};

export function RevisaoSplitClient({
  mesReferencia,
  initialOrcamentos,
  procedimentos,
  categorias,
}: Props) {
  const [orcamentos, setOrcamentos] = useState(initialOrcamentos);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function reload() {
    const data = await fetchSplitReview(mesReferencia);
    setOrcamentos(data);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function rowColor(orc: OrcamentoReviewRow): string {
    const hasUnmatched = orc.itens.some((it) => it.match_status === "unmatched");
    const hasDivergence = Math.abs(orc.divergencia) > 0.01;
    if (hasUnmatched) return "border-l-4 border-l-amber-400";
    if (hasDivergence) return "border-l-4 border-l-red-400";
    return "border-l-4 border-l-green-400";
  }

  async function handleUpdateItem(
    itemId: string,
    field: string,
    value: string
  ) {
    setSaving(itemId);
    try {
      if (field === "procedimento_id") {
        const proc = procedimentos.find((p) => p.id === value);
        await updateItemOrcamento(itemId, {
          procedimento_id: value || null,
          valor_tabela: proc?.valor_tabela ?? 0,
          categoria: proc?.categoria ?? null,
        });
      } else if (field === "valor_proporcional") {
        await updateItemOrcamento(itemId, {
          valor_proporcional: parseFloat(value) || 0,
        });
      } else if (field === "categoria") {
        await updateItemOrcamento(itemId, { categoria: value || null });
      }
      await reload();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(null);
    }
  }

  async function handleRemoveItem(itemId: string) {
    setSaving(itemId);
    try {
      await removeItemOrcamento(itemId);
      await reload();
      showToast("success", "Item removido.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setSaving(null);
    }
  }

  async function handleResplit(orcId: string) {
    setSaving(orcId);
    try {
      await resplitOrcamento(orcId);
      await reload();
      showToast("success", "Orcamento re-processado.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao re-processar");
    } finally {
      setSaving(null);
    }
  }

  const totalItens = orcamentos.reduce((a, o) => a + o.itens.length, 0);
  const totalUnmatched = orcamentos.reduce(
    (a, o) => a + o.itens.filter((it) => it.match_status === "unmatched").length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-bold text-white">
            Revisao de Itens — {mesReferencia}
          </h1>
          <p className="text-sm text-white/60 mt-1">
            {orcamentos.length} orcamento(s), {totalItens} item(ns)
            {totalUnmatched > 0 && (
              <span className="text-amber-400 ml-2">
                ({totalUnmatched} sem vinculo)
              </span>
            )}
          </p>
        </div>
        <Link
          href="/admin/configuracoes/fechamento"
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Voltar
        </Link>
      </div>

      {orcamentos.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-neutral-400 shadow-md">
          Nenhum orcamento desmembrado para este mes.
        </div>
      ) : (
        <div className="space-y-3">
          {orcamentos.map((orc) => (
            <div key={orc.id} className={`rounded-xl bg-white shadow-md overflow-hidden ${rowColor(orc)}`}>
              {/* Header do orcamento */}
              <button
                type="button"
                onClick={() => toggleExpand(orc.id)}
                className="w-full px-5 py-4 text-left hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <svg
                        className={`h-4 w-4 text-neutral-400 transition-transform ${expanded.has(orc.id) ? "rotate-90" : ""}`}
                        fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                      <span className="font-medium text-neutral-900">{orc.paciente_nome}</span>
                      <span className="text-xs text-neutral-400 truncate max-w-md">
                        {orc.procedimentos_texto}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <div className="text-xs text-neutral-500">Valor total</div>
                      <div className="font-medium tabular-nums">{fmt(orc.valor_total)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-neutral-500">Soma itens</div>
                      <div className={`font-medium tabular-nums ${Math.abs(orc.divergencia) > 0.01 ? "text-red-600" : "text-green-600"}`}>
                        {fmt(orc.soma_itens)}
                      </div>
                    </div>
                    {(() => {
                      const descontoPct = orc.desconto_percentual != null
                        ? orc.desconto_percentual
                        : (orc.desconto_reais != null && orc.valor_bruto && orc.valor_bruto > 0)
                          ? Math.round((orc.desconto_reais / orc.valor_bruto) * 10000) / 100
                          : null;
                      return (
                        <div className="text-right">
                          <div className="text-xs text-neutral-500">Desconto</div>
                          <div className="font-medium tabular-nums text-neutral-700">
                            {descontoPct != null ? `${descontoPct}%` : "—"}
                          </div>
                        </div>
                      );
                    })()}
                    {Math.abs(orc.divergencia) > 0.01 && (
                      <div className="text-right">
                        <div className="text-xs text-neutral-500">Dif.</div>
                        <div className="font-medium tabular-nums text-red-600">{fmt(orc.divergencia)}</div>
                      </div>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      orc.itens.every((it) => it.match_status !== "unmatched")
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {orc.itens.length} item(ns)
                    </span>
                  </div>
                </div>
              </button>

              {/* Itens expandidos */}
              {expanded.has(orc.id) && (
                <div className="border-t border-neutral-100 px-5 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-neutral-500">
                        <th className="py-2 text-left font-medium">Tratamento original</th>
                        <th className="py-2 text-left font-medium">Procedimento vinculado</th>
                        <th className="py-2 text-right font-medium">Valor tabela</th>
                        <th className="py-2 text-right font-medium">Valor final</th>
                        <th className="py-2 text-left font-medium">Categoria</th>
                        <th className="py-2 text-center font-medium">Status</th>
                        <th className="py-2 text-right font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orc.itens.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          procedimentos={procedimentos}
                          categorias={categorias}
                          saving={saving === item.id}
                          onUpdate={handleUpdateItem}
                          onRemove={handleRemoveItem}
                        />
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleResplit(orc.id)}
                      disabled={saving === orc.id}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
                    >
                      {saving === orc.id ? "Processando..." : "Re-split"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success" ? "bg-success-700 text-white" : "bg-danger-700 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ------ Item Row Component ------

function ItemRow({
  item,
  procedimentos,
  categorias,
  saving,
  onUpdate,
  onRemove,
}: {
  item: ItemOrcamentoRow;
  procedimentos: ProcedimentoRow[];
  categorias: string[];
  saving: boolean;
  onUpdate: (id: string, field: string, value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <tr className={`border-t border-neutral-50 ${item.match_status === "unmatched" ? "bg-amber-50/50" : ""}`}>
      <td className="py-2 text-neutral-900 font-medium">
        {item.procedimento_nome_original}
      </td>
      <td className="py-2">
        <select
          value={item.procedimento_id ?? ""}
          onChange={(e) => onUpdate(item.id, "procedimento_id", e.target.value)}
          disabled={saving}
          className="w-full max-w-xs rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600 disabled:opacity-50"
        >
          <option value="">— Sem vinculo —</option>
          {procedimentos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} {p.valor_tabela > 0 ? `(${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.valor_tabela)})` : ""}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 text-right tabular-nums text-neutral-600">
        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.valor_tabela)}
      </td>
      <td className="py-2 text-right">
        <input
          type="number"
          min={0}
          step={0.01}
          defaultValue={item.valor_proporcional}
          onBlur={(e) => onUpdate(item.id, "valor_proporcional", e.target.value)}
          disabled={saving}
          className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-xs text-right tabular-nums text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600 disabled:opacity-50"
        />
      </td>
      <td className="py-2">
        <select
          value={item.categoria ?? ""}
          onChange={(e) => onUpdate(item.id, "categoria", e.target.value)}
          disabled={saving}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600 disabled:opacity-50"
        >
          <option value="">—</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </td>
      <td className="py-2 text-center">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
          item.match_status === "auto"
            ? "bg-green-100 text-green-700"
            : item.match_status === "manual"
            ? "bg-blue-100 text-blue-700"
            : "bg-amber-100 text-amber-700"
        }`}>
          {item.match_status === "auto" ? "Auto" : item.match_status === "manual" ? "Manual" : "Pendente"}
        </span>
      </td>
      <td className="py-2 text-right">
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={saving}
          className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
        >
          Remover
        </button>
      </td>
    </tr>
  );
}

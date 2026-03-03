"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  listarProcedimentos,
  listarCategoriasProcedimentos,
  criarProcedimento,
  atualizarProcedimento,
  toggleAtivoProcedimento,
  excluirProcedimento,
  type ProcedimentoRow,
} from "./actions";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

type FormState = {
  nome: string;
  codigo_clinicorp: string;
  custo_fixo: string;
  categoria: string;
  ativo: boolean;
};

const emptyForm: FormState = {
  nome: "",
  codigo_clinicorp: "",
  custo_fixo: "0",
  categoria: "",
  ativo: true,
};

function rowToForm(r: ProcedimentoRow): FormState {
  return {
    nome: r.nome,
    codigo_clinicorp: r.codigo_clinicorp ?? "",
    custo_fixo: String(r.custo_fixo),
    categoria: r.categoria ?? "",
    ativo: r.ativo,
  };
}

function buildProcedimentosUrl(status: string, categoria: string) {
  const p = new URLSearchParams();
  if (status !== "todos") p.set("status", status);
  if (categoria) p.set("categoria", categoria);
  const q = p.toString();
  return `/admin/configuracoes/procedimentos${q ? `?${q}` : ""}`;
}

export function ProcedimentosClient({
  procedimentos: initial,
  categorias: initialCategorias,
  statusFilter,
  categoriaFilter,
}: {
  procedimentos: ProcedimentoRow[];
  categorias: string[];
  statusFilter: "todos" | "ativo" | "inativo";
  categoriaFilter: string;
}) {
  const router = useRouter();
  const [procedimentos, setProcedimentos] = useState<ProcedimentoRow[]>(initial);
  const [categorias, setCategorias] = useState<string[]>(initialCategorias);
  useEffect(() => {
    setProcedimentos(initial);
    setCategorias(initialCategorias);
  }, [initial, initialCategorias]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProcedimentoRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{ tipo: "desativar" | "excluir"; row: ProcedimentoRow } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function load() {
    const [data, cats] = await Promise.all([
      listarProcedimentos({ categoria: categoriaFilter || undefined, status: statusFilter }),
      listarCategoriasProcedimentos(),
    ]);
    setProcedimentos(data);
    setCategorias(cats);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(r: ProcedimentoRow) {
    setEditing(r);
    setForm(rowToForm(r));
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const custo = parseFloat(form.custo_fixo);
      if (!form.nome.trim()) throw new Error("Nome é obrigatório.");
      if (isNaN(custo) || custo < 0) throw new Error("Custo fixo deve ser ≥ 0.");
      if (editing) {
        await atualizarProcedimento(editing.id, {
          nome: form.nome,
          codigo_clinicorp: form.codigo_clinicorp || undefined,
          custo_fixo: custo,
          categoria: form.categoria || undefined,
          ativo: form.ativo,
        });
      } else {
        await criarProcedimento({
          nome: form.nome,
          codigo_clinicorp: form.codigo_clinicorp || undefined,
          custo_fixo: custo,
          categoria: form.categoria || undefined,
          ativo: form.ativo,
        });
      }
      setModalOpen(false);
      router.refresh();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  function openConfirm(tipo: "desativar" | "excluir", row: ProcedimentoRow) {
    setError(null);
    setConfirmModal({ tipo, row });
  }

  function closeConfirm() {
    setConfirmModal(null);
    setConfirmLoading(false);
    setError(null);
  }

  async function handleAtivar(row: ProcedimentoRow) {
    try {
      await toggleAtivoProcedimento(row.id, true);
      router.refresh();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ativar.");
    }
  }

  async function handleConfirmDesativar() {
    if (!confirmModal || confirmModal.tipo !== "desativar") return;
    setConfirmLoading(true);
    try {
      await toggleAtivoProcedimento(confirmModal.row.id, false);
      closeConfirm();
      router.refresh();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desativar.");
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleConfirmExcluir() {
    if (!confirmModal || confirmModal.tipo !== "excluir") return;
    setConfirmLoading(true);
    try {
      await excluirProcedimento(confirmModal.row.id);
      closeConfirm();
      router.refresh();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-white">Procedimentos</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-neutral-200 bg-white p-1">
            {(["todos", "ativo", "inativo"] as const).map((f) => (
              <Link
                key={f}
                href={buildProcedimentosUrl(f, categoriaFilter)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${statusFilter === f ? "bg-primary-600 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
              >
                {f === "todos" ? "Todos" : f === "ativo" ? "Ativos" : "Inativos"}
              </Link>
            ))}
          </div>
          <select
            value={categoriaFilter}
            onChange={(e) => router.push(buildProcedimentosUrl(statusFilter, e.target.value))}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Novo procedimento
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead>
            <tr className="bg-neutral-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">Código Clinicorp</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-600">Custo fixo</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">Categoria</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-neutral-600">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {procedimentos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">Nenhum procedimento encontrado.</td>
              </tr>
            ) : (
              procedimentos.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">{p.nome}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{p.codigo_clinicorp ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-sm text-neutral-600">{formatMoney(p.custo_fixo)}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{p.categoria ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${p.ativo ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600"}`}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => p.ativo ? openConfirm("desativar", p) : handleAtivar(p)} className="text-neutral-600 hover:text-neutral-900 mr-2 text-sm">
                      {p.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <button type="button" onClick={() => openEdit(p)} className="text-primary-600 hover:underline text-sm font-medium mr-2">Editar</button>
                    <button type="button" onClick={() => openConfirm("excluir", p)} className="text-red-600 hover:text-red-800 text-sm font-medium">Excluir</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">{editing ? "Editar procedimento" : "Novo procedimento"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Nome *</label>
                <input type="text" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Código Clinicorp</label>
                <input type="text" value={form.codigo_clinicorp} onChange={(e) => setForm((f) => ({ ...f, codigo_clinicorp: e.target.value }))} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Custo fixo (R$) *</label>
                <input type="number" min={0} step={0.01} value={form.custo_fixo} onChange={(e) => setForm((f) => ({ ...f, custo_fixo: e.target.value }))} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Categoria</label>
                <input type="text" value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600" list="categorias-list" />
                <datalist id="categorias-list">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} className="rounded border-neutral-300 text-primary-600 focus:ring-primary-600" />
                <label htmlFor="ativo" className="text-sm text-neutral-700">Ativo</label>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">{saving ? "Salvando…" : editing ? "Salvar" : "Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal?.tipo === "desativar" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Desativar procedimento</h3>
            <p className="text-neutral-600 text-sm mb-4">Desativar <strong>{confirmModal.row.nome}</strong>? Você pode ativá-lo novamente depois.</p>
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeConfirm} disabled={confirmLoading} className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={handleConfirmDesativar} disabled={confirmLoading} className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">{confirmLoading ? "Desativando…" : "Desativar"}</button>
            </div>
          </div>
        </div>
      )}

      {confirmModal?.tipo === "excluir" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Excluir procedimento</h3>
            <p className="text-neutral-600 text-sm mb-2">Excluir permanentemente <strong>{confirmModal.row.nome}</strong>? Esta ação não pode ser desfeita.</p>
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeConfirm} disabled={confirmLoading} className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={handleConfirmExcluir} disabled={confirmLoading} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{confirmLoading ? "Excluindo…" : "Excluir"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

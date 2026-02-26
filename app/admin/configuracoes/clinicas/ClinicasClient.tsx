"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  listarClinicas,
  criarClinica,
  atualizarClinica,
  toggleAtivoClinica,
  excluirClinica,
  type ClinicaRow,
} from "./actions";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercent(value: number) {
  return `${Number(value).toFixed(1)}%`;
}

type FormState = {
  nome: string;
  cnpj: string;
  responsavel: string;
  email: string;
  telefone: string;
  custo_mao_de_obra: string;
  percentual_split: string;
};

const emptyForm: FormState = {
  nome: "",
  cnpj: "",
  responsavel: "",
  email: "",
  telefone: "",
  custo_mao_de_obra: "0",
  percentual_split: "40",
};

function clinicaToForm(c: ClinicaRow): FormState {
  return {
    nome: c.nome,
    cnpj: c.cnpj ?? "",
    responsavel: c.responsavel ?? "",
    email: c.email ?? "",
    telefone: c.telefone ?? "",
    custo_mao_de_obra: String(c.custo_mao_de_obra),
    percentual_split: String(c.percentual_split),
  };
}

export function ClinicasClient({
  clinicas: initialClinicas,
  statusFilter,
}: {
  clinicas: ClinicaRow[];
  statusFilter: "todas" | "ativa" | "inativa";
}) {
  const router = useRouter();
  const [clinicas, setClinicas] = useState<ClinicaRow[]>(initialClinicas);
  useEffect(() => {
    setClinicas(initialClinicas);
  }, [initialClinicas]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicaRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Modal de confirmação: "desativar" | "excluir" + clínica */
  const [confirmModal, setConfirmModal] = useState<{ tipo: "desativar" | "excluir"; clinica: ClinicaRow } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function loadList(filtro: "todas" | "ativa" | "inativa") {
    const data = await listarClinicas(filtro);
    setClinicas(data);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(c: ClinicaRow) {
    setEditing(c);
    setForm(clinicaToForm(c));
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const custo = parseFloat(form.custo_mao_de_obra);
      const split = parseFloat(form.percentual_split);
      if (!form.nome.trim()) throw new Error("Nome é obrigatório.");
      if (isNaN(custo) || custo < 0) throw new Error("Custo mão de obra deve ser ≥ 0.");
      if (isNaN(split) || split < 0 || split > 100) throw new Error("Split deve ser entre 0 e 100.");

      if (editing) {
        await atualizarClinica(editing.id, {
          nome: form.nome,
          cnpj: form.cnpj || undefined,
          responsavel: form.responsavel || undefined,
          email: form.email || undefined,
          telefone: form.telefone || undefined,
          custo_mao_de_obra: custo,
          percentual_split: split,
        });
      } else {
        await criarClinica({
          nome: form.nome,
          cnpj: form.cnpj || undefined,
          responsavel: form.responsavel || undefined,
          email: form.email || undefined,
          telefone: form.telefone || undefined,
          custo_mao_de_obra: custo,
          percentual_split: split,
        });
      }
      setModalOpen(false);
      router.refresh();
      loadList(statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(c: ClinicaRow) {
    if (c.ativo) {
      setError(null);
      setConfirmModal({ tipo: "desativar", clinica: c });
    } else {
      try {
        await toggleAtivoClinica(c.id, true);
        router.refresh();
        loadList(statusFilter);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao ativar.");
      }
    }
  }

  function closeConfirmModal() {
    setConfirmModal(null);
    setConfirmLoading(false);
    setError(null);
  }

  async function handleConfirmDesativar() {
    if (!confirmModal || confirmModal.tipo !== "desativar") return;
    setConfirmLoading(true);
    setError(null);
    try {
      await toggleAtivoClinica(confirmModal.clinica.id, false);
      closeConfirmModal();
      router.refresh();
      loadList(statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desativar.");
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleConfirmExcluir() {
    if (!confirmModal || confirmModal.tipo !== "excluir") return;
    setConfirmLoading(true);
    setError(null);
    try {
      await excluirClinica(confirmModal.clinica.id);
      closeConfirmModal();
      router.refresh();
      loadList(statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-[#0A2463]">Clínicas parceiras</h2>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            {(["todas", "ativa", "inativa"] as const).map((f) => (
              <Link
                key={f}
                href={`/admin/configuracoes/clinicas${f === "todas" ? "" : `?status=${f}`}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  statusFilter === f ? "bg-[#0A2463] text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f === "todas" ? "Todas" : f === "ativa" ? "Ativas" : "Inativas"}
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-[#0A2463] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Nova clínica
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">CNPJ</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Responsável</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-600">Custo mão de obra</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-600">Split</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-slate-600">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {clinicas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Nenhuma clínica encontrada.
                </td>
              </tr>
            ) : (
              clinicas.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{c.nome}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{c.cnpj ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{c.responsavel ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-600">{formatMoney(c.custo_mao_de_obra)}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-600">{formatPercent(c.percentual_split)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.ativo ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {c.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggle(c)}
                      className="text-slate-600 hover:text-slate-900 mr-2 text-sm"
                    >
                      {c.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="text-[#0A2463] hover:underline text-sm font-medium mr-2"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setConfirmModal({ tipo: "excluir", clinica: c });
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Excluir
                    </button>
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
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editing ? "Editar clínica" : "Nova clínica"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-[#0A2463] focus:ring-1 focus:ring-[#0A2463]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-[#0A2463] focus:ring-1 focus:ring-[#0A2463]"
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
                <input
                  type="text"
                  value={form.responsavel}
                  onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-[#0A2463] focus:ring-1 focus:ring-[#0A2463]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-[#0A2463] focus:ring-1 focus:ring-[#0A2463]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-[#0A2463] focus:ring-1 focus:ring-[#0A2463]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Custo mão de obra (R$) *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.custo_mao_de_obra}
                    onChange={(e) => setForm((f) => ({ ...f, custo_mao_de_obra: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-[#0A2463] focus:ring-1 focus:ring-[#0A2463]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Split (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={form.percentual_split}
                    onChange={(e) => setForm((f) => ({ ...f, percentual_split: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-[#0A2463] focus:ring-1 focus:ring-[#0A2463]"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-[#0A2463] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Salvando…" : editing ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação: Desativar */}
      {confirmModal?.tipo === "desativar" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Desativar clínica</h3>
            <p className="text-slate-600 text-sm mb-4">
              Desativar a clínica <strong>{confirmModal.clinica.nome}</strong>? Ela não aparecerá nas listas de clínicas ativas. Você pode ativá-la novamente depois.
            </p>
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={confirmLoading}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDesativar}
                disabled={confirmLoading}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {confirmLoading ? "Desativando…" : "Desativar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação: Excluir */}
      {confirmModal?.tipo === "excluir" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Excluir clínica permanentemente</h3>
            <p className="text-slate-600 text-sm mb-2">
              Tem certeza que deseja excluir a clínica <strong>{confirmModal.clinica.nome}</strong>?
            </p>
            <p className="text-slate-500 text-xs mb-4">
              Esta ação não pode ser desfeita. Só é possível excluir clínicas sem usuários ou médicos vinculados.
            </p>
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={confirmLoading}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmExcluir}
                disabled={confirmLoading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {confirmLoading ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

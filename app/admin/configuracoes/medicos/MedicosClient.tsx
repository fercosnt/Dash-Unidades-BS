"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  listarMedicos,
  listarClinicasAtivas,
  criarMedico,
  atualizarMedico,
  toggleAtivoMedico,
  excluirMedico,
  type MedicoRow,
  type ClinicaOption,
} from "./actions";

function formatPercent(value: number) {
  return `${Number(value).toFixed(1)}%`;
}

type FormState = {
  nome: string;
  clinica_id: string;
  percentual_comissao: string;
  ativo: boolean;
};

const emptyForm: FormState = {
  nome: "",
  clinica_id: "",
  percentual_comissao: "10",
  ativo: true,
};

function rowToForm(r: MedicoRow): FormState {
  return {
    nome: r.nome,
    clinica_id: r.clinica_id,
    percentual_comissao: String(r.percentual_comissao),
    ativo: r.ativo,
  };
}

export function MedicosClient({
  medicos: initial,
  clinicas,
  clinicaFilter,
}: {
  medicos: MedicoRow[];
  clinicas: ClinicaOption[];
  clinicaFilter: string;
}) {
  const router = useRouter();
  const [medicos, setMedicos] = useState<MedicoRow[]>(initial);
  useEffect(() => {
    setMedicos(initial);
  }, [initial]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MedicoRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{ tipo: "desativar" | "excluir"; row: MedicoRow } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function load() {
    const data = await listarMedicos(clinicaFilter || undefined);
    setMedicos(data);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, clinica_id: clinicaFilter || (clinicas[0]?.id ?? "") });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(r: MedicoRow) {
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
      const comissao = parseFloat(form.percentual_comissao);
      if (!form.nome.trim()) throw new Error("Nome é obrigatório.");
      if (!form.clinica_id) throw new Error("Clínica é obrigatória.");
      if (isNaN(comissao) || comissao < 0 || comissao > 100) throw new Error("Comissão deve ser entre 0 e 100.");
      if (editing) {
        await atualizarMedico(editing.id, {
          nome: form.nome,
          clinica_id: form.clinica_id,
          percentual_comissao: comissao,
          ativo: form.ativo,
        });
      } else {
        await criarMedico({
          nome: form.nome,
          clinica_id: form.clinica_id,
          percentual_comissao: comissao,
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

  function openConfirm(tipo: "desativar" | "excluir", row: MedicoRow) {
    setError(null);
    setConfirmModal({ tipo, row });
  }

  function closeConfirm() {
    setConfirmModal(null);
    setConfirmLoading(false);
    setError(null);
  }

  async function handleAtivar(row: MedicoRow) {
    try {
      await toggleAtivoMedico(row.id, true);
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
      await toggleAtivoMedico(confirmModal.row.id, false);
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
      await excluirMedico(confirmModal.row.id);
      closeConfirm();
      router.refresh();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setConfirmLoading(false);
    }
  }

  const medicosUrl = (clinicaId: string) =>
    `/admin/configuracoes/medicos${clinicaId ? `?clinica=${clinicaId}` : ""}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-white">Médicos indicadores</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={clinicaFilter}
            onChange={(e) => router.push(medicosUrl(e.target.value))}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
          >
            <option value="">Todas as clínicas</option>
            {clinicas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Novo médico
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead>
            <tr className="bg-neutral-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">Clínica</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-600">Comissão</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-neutral-600">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {medicos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">Nenhum médico encontrado.</td>
              </tr>
            ) : (
              medicos.map((m) => (
                <tr key={m.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">{m.nome}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{m.clinica_nome}</td>
                  <td className="px-4 py-3 text-right text-sm text-neutral-600">{formatPercent(m.percentual_comissao)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${m.ativo ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600"}`}>
                      {m.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => m.ativo ? openConfirm("desativar", m) : handleAtivar(m)} className="text-neutral-600 hover:text-neutral-900 mr-2 text-sm">
                      {m.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <button type="button" onClick={() => openEdit(m)} className="text-primary-600 hover:underline text-sm font-medium mr-2">Editar</button>
                    <button type="button" onClick={() => openConfirm("excluir", m)} className="text-red-600 hover:text-red-800 text-sm font-medium">Excluir</button>
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
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">{editing ? "Editar médico" : "Novo médico"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Nome *</label>
                <input type="text" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Clínica *</label>
                <select value={form.clinica_id} onChange={(e) => setForm((f) => ({ ...f, clinica_id: e.target.value }))} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600" required>
                  <option value="">Selecione</option>
                  {clinicas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Comissão (%) *</label>
                <input type="number" min={0} max={100} step={0.1} value={form.percentual_comissao} onChange={(e) => setForm((f) => ({ ...f, percentual_comissao: e.target.value }))} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600" />
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
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Desativar médico</h3>
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
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Excluir médico</h3>
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

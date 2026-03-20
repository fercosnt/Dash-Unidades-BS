"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  listarUsuarios,
  criarUsuario,
  atualizarUsuario,
  toggleAtivoUsuario,
  resetarSenha,
  type UsuarioRow,
  type ClinicaOption,
} from "./actions";

type FormState = {
  email: string;
  senha: string;
  nome: string;
  role: "admin" | "parceiro";
  clinica_id: string;
};

const emptyForm: FormState = {
  email: "",
  senha: "",
  nome: "",
  role: "parceiro",
  clinica_id: "",
};

function usuarioToForm(u: UsuarioRow): FormState {
  return {
    email: u.email ?? "",
    senha: "",
    nome: u.nome ?? "",
    role: u.role as "admin" | "parceiro",
    clinica_id: u.clinica_id ?? "",
  };
}

export function UsuariosClient({
  usuarios: initialUsuarios,
  clinicas,
  statusFilter,
}: {
  usuarios: UsuarioRow[];
  clinicas: ClinicaOption[];
  statusFilter: "todos" | "ativo" | "inativo";
}) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>(initialUsuarios);
  useEffect(() => {
    setUsuarios(initialUsuarios);
  }, [initialUsuarios]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UsuarioRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    tipo: "desativar";
    usuario: UsuarioRow;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Modal de resetar senha
  const [senhaModal, setSenhaModal] = useState<UsuarioRow | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [senhaLoading, setSenhaLoading] = useState(false);

  async function loadList(filtro: "todos" | "ativo" | "inativo") {
    const data = await listarUsuarios(filtro);
    setUsuarios(data);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  }

  function openEdit(u: UsuarioRow) {
    setEditing(u);
    setForm(usuarioToForm(u));
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      if (!form.nome.trim()) throw new Error("Nome é obrigatório.");
      if (form.role === "parceiro" && !form.clinica_id)
        throw new Error("Selecione a clínica para o parceiro.");

      if (editing) {
        await atualizarUsuario(editing.id, {
          nome: form.nome,
          role: form.role,
          clinica_id: form.clinica_id || undefined,
        });
      } else {
        if (!form.email.trim()) throw new Error("E-mail é obrigatório.");
        if (!form.senha || form.senha.length < 6)
          throw new Error("Senha deve ter no mínimo 6 caracteres.");
        await criarUsuario({
          email: form.email,
          senha: form.senha,
          nome: form.nome,
          role: form.role,
          clinica_id: form.clinica_id || undefined,
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

  async function handleToggle(u: UsuarioRow) {
    setError(null);
    setSuccess(null);
    if (u.ativo) {
      setConfirmModal({ tipo: "desativar", usuario: u });
    } else {
      try {
        await toggleAtivoUsuario(u.id, true);
        setSuccess(`Usuário ${u.nome ?? u.email} ativado.`);
        router.refresh();
        loadList(statusFilter);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao ativar.");
      }
    }
  }

  async function handleConfirmDesativar() {
    if (!confirmModal) return;
    setConfirmLoading(true);
    setError(null);
    try {
      await toggleAtivoUsuario(confirmModal.usuario.id, false);
      setConfirmModal(null);
      setConfirmLoading(false);
      router.refresh();
      loadList(statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desativar.");
      setConfirmLoading(false);
    }
  }

  async function handleResetarSenha() {
    if (!senhaModal) return;
    setSenhaLoading(true);
    setError(null);
    try {
      await resetarSenha(senhaModal.id, novaSenha);
      setSenhaModal(null);
      setNovaSenha("");
      setSenhaLoading(false);
      setSuccess("Senha alterada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao resetar senha.");
      setSenhaLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-white">Usuários</h2>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-neutral-200 bg-white p-1">
            {(["todos", "ativo", "inativo"] as const).map((f) => (
              <Link
                key={f}
                href={`/admin/configuracoes/usuarios${f === "todos" ? "" : `?status=${f}`}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  statusFilter === f
                    ? "bg-primary-600 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {f === "todos" ? "Todos" : f === "ativo" ? "Ativos" : "Inativos"}
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Novo usuário
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead>
            <tr className="bg-neutral-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">
                Nome
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">
                E-mail
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">
                Perfil
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">
                Clínica
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-neutral-600">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-600">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {usuarios.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                    {u.nome ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {u.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {u.role === "admin" ? "Admin" : "Parceiro"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {u.clinica_nome ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.ativo
                          ? "bg-green-100 text-green-800"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggle(u)}
                      className="mr-2 text-sm text-neutral-600 hover:text-neutral-900"
                    >
                      {u.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="mr-2 text-sm font-medium text-primary-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        setNovaSenha("");
                        setSenhaModal(u);
                      }}
                      className="text-sm font-medium text-amber-600 hover:underline"
                    >
                      Senha
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal criar/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">
              {editing ? "Editar usuário" : "Novo usuário"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editing && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Senha *
                    </label>
                    <input
                      type="password"
                      value={form.senha}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, senha: e.target.value }))
                      }
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Nome *
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nome: e.target.value }))
                  }
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Perfil *
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      role: e.target.value as "admin" | "parceiro",
                      clinica_id:
                        e.target.value === "admin" ? "" : f.clinica_id,
                    }))
                  }
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
                >
                  <option value="parceiro">Parceiro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {form.role === "parceiro" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Clínica *
                  </label>
                  <select
                    value={form.clinica_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, clinica_id: e.target.value }))
                    }
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
                    required
                  >
                    <option value="">Selecione...</option>
                    {clinicas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Salvando…" : editing ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar desativar */}
      {confirmModal?.tipo === "desativar" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-neutral-900">
              Desativar usuário
            </h3>
            <p className="mb-4 text-sm text-neutral-600">
              Desativar{" "}
              <strong>
                {confirmModal.usuario.nome ?? confirmModal.usuario.email}
              </strong>
              ? O usuário não conseguirá fazer login. Você pode reativá-lo
              depois.
            </p>
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmModal(null);
                  setConfirmLoading(false);
                  setError(null);
                }}
                disabled={confirmLoading}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
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

      {/* Modal resetar senha */}
      {senhaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-neutral-900">
              Alterar senha
            </h3>
            <p className="mb-4 text-sm text-neutral-600">
              Nova senha para{" "}
              <strong>{senhaModal.nome ?? senhaModal.email}</strong>:
            </p>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="mb-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
              minLength={6}
            />
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSenhaModal(null);
                  setNovaSenha("");
                  setError(null);
                }}
                disabled={senhaLoading}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetarSenha}
                disabled={senhaLoading || novaSenha.length < 6}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {senhaLoading ? "Salvando…" : "Alterar senha"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

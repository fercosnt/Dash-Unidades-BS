"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  fetchTodasCategorias,
  criarCategoria,
  editarCategoria,
  toggleCategoria,
} from "./actions";
import type { CategoriaRow } from "./actions";

export function CategoriasClient({
  categorias: initialCategorias,
}: {
  categorias: CategoriaRow[];
}) {
  const router = useRouter();
  const [categorias, setCategorias] = useState<CategoriaRow[]>(initialCategorias);
  useEffect(() => {
    setCategorias(initialCategorias);
  }, [initialCategorias]);

  const [novoNome, setNovoNome] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState("");

  async function recarregar() {
    const data = await fetchTodasCategorias();
    setCategorias(data);
    router.refresh();
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!novoNome.trim()) return;
    setSaving(true);
    try {
      const res = await criarCategoria({ nome: novoNome.trim() });
      if (!res.ok) {
        setError(res.error ?? "Erro ao criar categoria.");
        return;
      }
      setNovoNome("");
      await recarregar();
    } catch {
      setError("Erro ao criar categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditar(id: string) {
    setError(null);
    if (!editandoNome.trim()) return;
    setSaving(true);
    try {
      const res = await editarCategoria({ id, nome: editandoNome.trim() });
      if (!res.ok) {
        setError(res.error ?? "Erro ao editar categoria.");
        return;
      }
      setEditandoId(null);
      setEditandoNome("");
      await recarregar();
    } catch {
      setError("Erro ao editar categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, ativo: boolean) {
    setError(null);
    try {
      const res = await toggleCategoria(id, ativo);
      if (!res.ok) {
        setError(res.error ?? "Erro ao alterar status.");
        return;
      }
      await recarregar();
    } catch {
      setError("Erro ao alterar status.");
    }
  }

  function iniciarEdicao(cat: CategoriaRow) {
    setEditandoId(cat.id);
    setEditandoNome(cat.nome);
    setError(null);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setEditandoNome("");
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Categorias de Despesa</h2>
        <p className="mt-1 text-sm text-white/80">
          Gerencie as categorias usadas nas despesas operacionais.
        </p>
      </div>

      {/* Formulário para nova categoria */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 mb-8">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Nova categoria</h3>
        <form onSubmit={handleCriar} className="flex items-end gap-3 max-w-lg">
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Nome da categoria
            </label>
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex: Material odontológico"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !novoNome.trim()}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Adicionar"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>

      {/* Tabela de categorias */}
      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <h3 className="text-lg font-semibold text-neutral-900 p-4 border-b border-neutral-200">
          Categorias cadastradas
        </h3>
        <table className="min-w-full divide-y divide-neutral-200">
          <thead>
            <tr className="bg-neutral-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">
                Nome
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-neutral-600">
                Ativo
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-600">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {categorias.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  Nenhuma categoria cadastrada.
                </td>
              </tr>
            ) : (
              categorias.map((cat) => (
                <tr key={cat.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm text-neutral-900">
                    {editandoId === cat.id ? (
                      <input
                        type="text"
                        value={editandoNome}
                        onChange={(e) => setEditandoNome(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditar(cat.id);
                          if (e.key === "Escape") cancelarEdicao();
                        }}
                        autoFocus
                        className="w-full max-w-xs rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
                      />
                    ) : (
                      cat.nome
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(cat.id, !cat.ativo)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        cat.ativo
                          ? "bg-green-100 text-green-800"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {cat.ativo ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {editandoId === cat.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditar(cat.id)}
                          disabled={saving || !editandoNome.trim()}
                          className="text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={cancelarEdicao}
                          className="text-neutral-500 hover:text-neutral-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => iniciarEdicao(cat)}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { criarProcedimentoRapido } from "@/app/admin/upload/revisao/actions";

type Props = {
  onCreated: (proc: { id: string; nome: string }) => void;
  onClose: () => void;
};

export function CreateProcedureModal({ onCreated, onClose }: Props) {
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed) return;
    setCriando(true);
    setErro("");
    const result = await criarProcedimentoRapido(trimmed);
    setCriando(false);
    if ("error" in result) {
      setErro(result.error);
      return;
    }
    onCreated({ id: result.id, nome: trimmed });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Criar novo procedimento</h3>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Nome do procedimento</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Clareamento dental"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm mb-2"
            autoFocus
          />
          {erro && <p className="text-xs text-red-600 mb-2">{erro}</p>}
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={criando}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criando || !nome.trim()}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {criando ? "Criando..." : "Criar procedimento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

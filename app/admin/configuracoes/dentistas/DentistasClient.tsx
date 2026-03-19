"use client";
import { useState } from "react";
import { criarDentista, desativarDentista, ativarDentista } from "./actions";
import type { DentistaItem } from "@/lib/dentista-queries";

export function DentistasClient({
  dentistas: initialDentistas,
  clinicas,
}: {
  dentistas: DentistaItem[];
  clinicas: { id: string; nome: string }[];
}) {
  const [dentistas, setDentistas] = useState(initialDentistas);
  const [nome, setNome] = useState("");
  const [clinicaId, setClinicaId] = useState(clinicas[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [confirmDesativarId, setConfirmDesativarId] = useState<string | null>(null);

  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !clinicaId) return;
    setSaving(true);
    const result = await criarDentista({ clinicaId, nome: nome.trim(), email: email.trim() || undefined, telefone: telefone.trim() || undefined });
    setSaving(false);
    if (result.ok) {
      const clinica = clinicas.find((c) => c.id === clinicaId);
      setDentistas((prev) => [
        {
          id: crypto.randomUUID(),
          clinicaId,
          clinicaNome: clinica?.nome ?? "—",
          nome: nome.trim(),
          email: email.trim() || null,
          telefone: telefone.trim() || null,
          ativo: true,
        },
        ...prev,
      ]);
      setNome("");
      setEmail("");
      setTelefone("");
      setMsg({ tipo: "ok", texto: "Dentista adicionada com sucesso." });
      setTimeout(() => setMsg(null), 4000);
    } else {
      setMsg({ tipo: "erro", texto: result.error ?? "Erro ao adicionar." });
    }
  }

  async function handleDesativar(id: string) {
    setConfirmDesativarId(null);
    const result = await desativarDentista(id);
    if (result.ok) {
      setDentistas((prev) => prev.map((d) => (d.id === id ? { ...d, ativo: false } : d)));
      setMsg({ tipo: "ok", texto: "Dentista desativada." });
      setTimeout(() => setMsg(null), 3000);
    } else {
      setMsg({ tipo: "erro", texto: result.error ?? "Erro ao desativar." });
    }
  }

  async function handleAtivar(id: string) {
    const result = await ativarDentista(id);
    if (result.ok) {
      setDentistas((prev) => prev.map((d) => (d.id === id ? { ...d, ativo: true } : d)));
      setMsg({ tipo: "ok", texto: "Dentista reativada." });
      setTimeout(() => setMsg(null), 3000);
    } else {
      setMsg({ tipo: "erro", texto: result.error ?? "Erro ao reativar." });
    }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded px-3 py-2 text-sm ${msg.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {msg.texto}
        </div>
      )}

      {/* Formulário */}
      <div className="rounded-xl bg-white shadow-md p-6">
        <h3 className="text-sm font-bold text-neutral-900 mb-4">Adicionar dentista</h3>
        <form onSubmit={handleAdicionar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-neutral-700">Nome *</span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              placeholder="Dra. Maria Silva"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-700">Clínica *</span>
            <select
              value={clinicaId}
              onChange={(e) => setClinicaId(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              <option value="">Selecione</option>
              {clinicas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-700">E-mail (opcional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              placeholder="dra@clinica.com"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-neutral-700">Telefone (opcional)</span>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              placeholder="(11) 99999-9999"
            />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving || !nome.trim() || !clinicaId}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Adicionar"}
            </button>
          </div>
        </form>
      </div>

      {/* Tabela */}
      <div className="rounded-xl bg-white shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h3 className="text-sm font-bold text-neutral-900">Dentistas cadastradas</h3>
        </div>
        {dentistas.length === 0 ? (
          <p className="px-6 py-8 text-sm text-center text-neutral-400">Nenhuma dentista cadastrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Clínica</th>
                <th className="px-4 py-3 text-left font-medium">E-mail</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {dentistas.map((d) => (
                <tr key={d.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-900 font-medium">{d.nome}</td>
                  <td className="px-4 py-3 text-neutral-600">{d.clinicaNome}</td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">{d.email ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.ativo ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-500"}`}>
                      {d.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.ativo ? (
                      confirmDesativarId === d.id ? (
                        <span className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => handleDesativar(d.id)}
                            className="text-xs text-red-600 font-medium hover:underline"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDesativarId(null)}
                            className="text-xs text-neutral-500 hover:underline"
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDesativarId(d.id)}
                          className="text-xs text-neutral-500 hover:text-red-600"
                        >
                          Desativar
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAtivar(d.id)}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        Ativar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

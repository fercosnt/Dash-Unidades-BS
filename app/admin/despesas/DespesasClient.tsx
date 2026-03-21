"use client";

import { useState, useCallback } from "react";
import { PeriodoSelector } from "@/components/dashboard/PeriodoSelector";
import { ClinicaSelector } from "@/components/dashboard/ClinicaSelector";
import { DreBsUnidade } from "@/components/dashboard/DreBsUnidade";
import { formatCurrency } from "@/lib/utils/formatting";
import { fetchDespesasPorMes, calcularDreBsUnidade, fetchCategoriasAtivas } from "@/lib/despesas-queries";
import type { DespesaItem } from "@/lib/despesas-queries";
import type { DreBsUnidadeData } from "@/types/dashboard.types";
import { criarDespesa, editarDespesa, excluirDespesa, copiarDespesasMesAnterior, criarDespesasBulk } from "./actions";
import { parseXLSXFile, removeHeaderRow } from "@/lib/utils/xlsx-parser";
import { parseCurrencyBR } from "@/lib/utils/formatting";

type Clinica = { id: string; nome: string };
type Categoria = { id: string; nome: string; ativo: boolean };

type Props = {
  clinicas: Clinica[];
  categorias: Categoria[];
  initialDespesas: DespesaItem[];
  initialDreBs: DreBsUnidadeData;
  initialMes: string;
};

export function DespesasClient({ clinicas, categorias: initialCategorias, initialDespesas, initialDreBs, initialMes }: Props) {
  const [mes, setMes] = useState(initialMes);
  const [clinicaId, setClinicaId] = useState("");
  const [despesas, setDespesas] = useState<DespesaItem[]>(initialDespesas);
  const [dreBs, setDreBs] = useState<DreBsUnidadeData>(initialDreBs);
  const [categorias, setCategorias] = useState<Categoria[]>(initialCategorias);
  const [loading, setLoading] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formClinicaId, setFormClinicaId] = useState("");
  const [formCategoriaId, setFormCategoriaId] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formValor, setFormValor] = useState("");
  const [formRecorrente, setFormRecorrente] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editCategoriaId, setEditCategoriaId] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editRecorrente, setEditRecorrente] = useState(false);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<{ categoriaId: string; categoriaNome: string; descricao: string; valor: number }[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const mesRef = mes === "all" ? "" : `${mes}-01`;

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [newDespesas, newDreBs, newCategorias] = await Promise.all([
        fetchDespesasPorMes(mes, clinicaId || undefined),
        calcularDreBsUnidade(mes, clinicaId || undefined),
        fetchCategoriasAtivas(),
      ]);
      setDespesas(newDespesas);
      setDreBs(newDreBs);
      setCategorias(newCategorias);
    } finally {
      setLoading(false);
    }
  }, [mes, clinicaId]);

  async function handlePeriodoChange(p: string) {
    setMes(p);
    setLoading(true);
    try {
      const [d, dre, cats] = await Promise.all([
        fetchDespesasPorMes(p, clinicaId || undefined),
        calcularDreBsUnidade(p, clinicaId || undefined),
        fetchCategoriasAtivas(),
      ]);
      setDespesas(d);
      setDreBs(dre);
      setCategorias(cats);
    } finally {
      setLoading(false);
    }
  }

  async function handleClinicaChange(c: string) {
    setClinicaId(c);
    setLoading(true);
    try {
      const [d, dre] = await Promise.all([
        fetchDespesasPorMes(mes, c || undefined),
        calcularDreBsUnidade(mes, c || undefined),
      ]);
      setDespesas(d);
      setDreBs(dre);
    } finally {
      setLoading(false);
    }
  }

  /* ---- CRIAR ---- */
  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const valor = parseFloat(formValor.replace(",", "."));
    if (!formClinicaId) { setFormError("Selecione a clínica."); return; }
    if (!formCategoriaId) { setFormError("Selecione a categoria."); return; }
    if (isNaN(valor) || valor <= 0) { setFormError("Valor inválido."); return; }
    if (!mesRef) { setFormError("Selecione um mês específico."); return; }

    setSaving(true);
    const res = await criarDespesa({
      clinicaId: formClinicaId,
      mesReferencia: mesRef,
      categoriaId: formCategoriaId,
      descricao: formDescricao || undefined,
      valor,
      recorrente: formRecorrente,
    });
    setSaving(false);

    if (!res.ok) { setFormError(res.error ?? "Erro ao salvar."); return; }
    setShowForm(false);
    setFormClinicaId("");
    setFormCategoriaId("");
    setFormDescricao("");
    setFormValor("");
    setFormRecorrente(false);
    await refetch();
  }

  /* ---- EDITAR ---- */
  function startEdit(d: DespesaItem) {
    setEditId(d.id);
    setEditCategoriaId(d.categoriaId);
    setEditDescricao(d.descricao ?? "");
    setEditValor(String(d.valor));
    setEditRecorrente(d.recorrente);
  }

  async function handleSaveEdit() {
    if (!editId) return;
    const valor = parseFloat(editValor.replace(",", "."));
    if (isNaN(valor) || valor <= 0) return;

    setSaving(true);
    await editarDespesa({
      id: editId,
      categoriaId: editCategoriaId,
      descricao: editDescricao,
      valor,
      recorrente: editRecorrente,
    });
    setSaving(false);
    setEditId(null);
    await refetch();
  }

  /* ---- EXCLUIR ---- */
  async function handleExcluir(id: string) {
    if (!confirm("Excluir esta despesa?")) return;
    await excluirDespesa(id);
    await refetch();
  }

  /* ---- COPIAR MÊS ANTERIOR ---- */
  async function handleCopiar() {
    if (!clinicaId) { alert("Selecione uma clínica para copiar."); return; }
    if (!mesRef) { alert("Selecione um mês específico."); return; }
    if (!confirm("Copiar despesas recorrentes do mês anterior?")) return;

    const res = await copiarDespesasMesAnterior(clinicaId, mesRef);
    if (!res.ok) { alert(res.error); return; }
    alert(`${res.count} despesas copiadas.`);
    await refetch();
  }

  /* ---- UPLOAD XLSX ---- */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError(null);
    setUploadPreview([]);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const raw = await parseXLSXFile(file);
      const { headers, rows } = removeHeaderRow(raw);

      const catIdx = headers.findIndex((h) => /categoria/i.test(h));
      const descIdx = headers.findIndex((h) => /descri/i.test(h));
      const valIdx = headers.findIndex((h) => /valor/i.test(h));

      if (catIdx < 0 || valIdx < 0) {
        setUploadError("Planilha deve ter colunas 'Categoria' e 'Valor'.");
        return;
      }

      const catMap = new Map(categorias.map((c) => [c.nome.toLowerCase().trim(), c]));
      const preview: typeof uploadPreview = [];
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const catNome = String(row[catIdx] ?? "").trim();
        const descricao = descIdx >= 0 ? String(row[descIdx] ?? "").trim() : "";
        const valorRaw = String(row[valIdx] ?? "");
        const valor = parseCurrencyBR(valorRaw);

        const cat = catMap.get(catNome.toLowerCase());
        if (!cat) { errors.push(`Linha ${i + 2}: Categoria "${catNome}" não encontrada.`); continue; }
        if (valor <= 0) { errors.push(`Linha ${i + 2}: Valor inválido "${valorRaw}".`); continue; }

        preview.push({ categoriaId: cat.id, categoriaNome: cat.nome, descricao, valor });
      }

      if (errors.length > 0) setUploadError(errors.join("\n"));
      setUploadPreview(preview);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro ao ler arquivo.");
    }
  }

  async function handleConfirmUpload() {
    if (!clinicaId) { alert("Selecione uma clínica."); return; }
    if (!mesRef) { alert("Selecione um mês."); return; }

    setSaving(true);
    const res = await criarDespesasBulk({
      clinicaId,
      mesReferencia: mesRef,
      items: uploadPreview.map((p) => ({
        categoriaId: p.categoriaId,
        descricao: p.descricao || undefined,
        valor: p.valor,
        recorrente: false,
      })),
    });
    setSaving(false);

    if (!res.ok) { alert(res.error); return; }
    alert(`${res.count} despesas importadas.`);
    setShowUpload(false);
    setUploadPreview([]);
    setUploadError(null);
    await refetch();
  }

  /* ---- TOTAIS ---- */
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Despesas Operacionais</h2>
        <p className="mt-1 text-sm text-white/80">Gestão de despesas e resultado por unidade.</p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <PeriodoSelector selectedPeriodo={mes} onChange={handlePeriodoChange} />
        <ClinicaSelector clinicas={clinicas} selectedClinicaId={clinicaId} onChange={handleClinicaChange} />
        {loading && <span className="text-xs text-white/60">Carregando…</span>}
      </div>

      {/* DRE Beauty Smile */}
      <DreBsUnidade data={dreBs} className="mb-6" />

      {/* Ações */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => { setShowForm(!showForm); setShowUpload(false); }}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Nova Despesa
        </button>
        <button
          onClick={() => { setShowUpload(!showUpload); setShowForm(false); }}
          className="rounded-md border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50"
        >
          Upload XLSX
        </button>
        <button
          onClick={handleCopiar}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Copiar do Mês Anterior
        </button>
      </div>

      {/* Form Nova Despesa */}
      {showForm && (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Nova Despesa</h3>
          <form onSubmit={handleCriar} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Clínica</label>
              <select
                value={formClinicaId}
                onChange={(e) => setFormClinicaId(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
              >
                <option value="">Selecione…</option>
                {clinicas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Categoria</label>
              <select
                value={formCategoriaId}
                onChange={(e) => setFormCategoriaId(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
              >
                <option value="">Selecione…</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Valor (R$)</label>
              <input
                type="text"
                value={formValor}
                onChange={(e) => setFormValor(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">Descrição (opcional)</label>
              <input
                type="text"
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Ex: Uber Dr. Silva 15/03"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recorrente"
                checked={formRecorrente}
                onChange={(e) => setFormRecorrente(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
              />
              <label htmlFor="recorrente" className="text-sm text-neutral-700">Recorrente</label>
            </div>
            <div className="flex items-end gap-3 sm:col-span-full">
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upload XLSX */}
      {showUpload && (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Upload de Despesas (XLSX)</h3>
          <p className="text-sm text-neutral-500 mb-4">
            Planilha com colunas: <strong>Categoria</strong> | Descrição | <strong>Valor</strong>.
            {!clinicaId && <span className="text-amber-600 ml-2">Selecione uma clínica nos filtros acima.</span>}
          </p>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="block text-sm text-neutral-700 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
          />
          {uploadError && <pre className="mt-3 rounded bg-red-50 p-3 text-xs text-red-700 whitespace-pre-wrap">{uploadError}</pre>}
          {uploadPreview.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-neutral-700 mb-2">{uploadPreview.length} despesas encontradas:</p>
              <table className="min-w-full divide-y divide-neutral-200">
                <thead>
                  <tr className="bg-neutral-50">
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-neutral-600">Categoria</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-neutral-600">Descrição</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-neutral-600">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {uploadPreview.map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-sm text-neutral-900">{p.categoriaNome}</td>
                      <td className="px-3 py-2 text-sm text-neutral-600">{p.descricao || "—"}</td>
                      <td className="px-3 py-2 text-right text-sm text-neutral-900">{formatCurrency(p.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleConfirmUpload}
                  disabled={saving || !clinicaId}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Importando…" : "Confirmar Importação"}
                </button>
                <button
                  onClick={() => { setShowUpload(false); setUploadPreview([]); setUploadError(null); }}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabela de despesas */}
      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h3 className="text-lg font-semibold text-neutral-900">Despesas do Período</h3>
          <span className="text-sm font-medium text-neutral-600">
            Total: <span className="text-neutral-900">{formatCurrency(totalDespesas)}</span>
          </span>
        </div>
        <table className="min-w-full divide-y divide-neutral-200">
          <thead>
            <tr className="bg-neutral-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">Clínica</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">Categoria</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">Descrição</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-600">Valor</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-neutral-600">Recorrente</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {despesas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  Nenhuma despesa registrada neste período.
                </td>
              </tr>
            ) : (
              despesas.map((d) => (
                <tr key={d.id} className="hover:bg-neutral-50">
                  {editId === d.id ? (
                    <>
                      <td className="px-4 py-3 text-sm text-neutral-900">{d.clinicaNome}</td>
                      <td className="px-4 py-3">
                        <select
                          value={editCategoriaId}
                          onChange={(e) => setEditCategoriaId(e.target.value)}
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                        >
                          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editDescricao}
                          onChange={(e) => setEditDescricao(e.target.value)}
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editValor}
                          onChange={(e) => setEditValor(e.target.value)}
                          className="w-24 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={editRecorrente}
                          onChange={(e) => setEditRecorrente(e.target.checked)}
                          className="h-4 w-4 rounded border-neutral-300 text-primary-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={handleSaveEdit} disabled={saving} className="text-sm text-primary-600 hover:underline mr-2">
                          Salvar
                        </button>
                        <button onClick={() => setEditId(null)} className="text-sm text-neutral-500 hover:underline">
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm text-neutral-900">{d.clinicaNome}</td>
                      <td className="px-4 py-3 text-sm text-neutral-700">{d.categoriaNome}</td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{d.descricao || "—"}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-neutral-900">{formatCurrency(d.valor)}</td>
                      <td className="px-4 py-3 text-center">
                        {d.recorrente ? (
                          <span className="inline-block rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">Sim</span>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => startEdit(d)} className="text-sm text-primary-600 hover:underline mr-2">
                          Editar
                        </button>
                        <button onClick={() => handleExcluir(d.id)} className="text-sm text-red-600 hover:underline">
                          Excluir
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

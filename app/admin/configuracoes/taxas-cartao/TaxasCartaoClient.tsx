"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchTaxasVigentes, salvarTaxas } from "./actions";
import type { TaxaCartaoRow } from "./actions";

type TaxaForm = {
  modalidade: "credito" | "debito";
  bandeira: "visa_master" | "outros";
  numero_parcelas: number | null;
  taxa_percentual: number;
};

const BANDEIRAS = [
  { value: "visa_master" as const, label: "Visa / Mastercard" },
  { value: "outros" as const, label: "Outras Bandeiras" },
] as const;

function buildInitialForm(taxas: TaxaCartaoRow[]): TaxaForm[] {
  const rows: TaxaForm[] = [];

  for (const bandeira of BANDEIRAS) {
    // Crédito 1x a 12x
    for (let i = 1; i <= 12; i++) {
      const existing = taxas.find(
        (t) => t.modalidade === "credito" && t.bandeira === bandeira.value && t.numero_parcelas === i
      );
      rows.push({
        modalidade: "credito",
        bandeira: bandeira.value,
        numero_parcelas: i,
        taxa_percentual: existing?.taxa_percentual ?? 0,
      });
    }

    // Débito
    const debito = taxas.find(
      (t) => t.modalidade === "debito" && t.bandeira === bandeira.value
    );
    rows.push({
      modalidade: "debito",
      bandeira: bandeira.value,
      numero_parcelas: null,
      taxa_percentual: debito?.taxa_percentual ?? 0,
    });
  }

  return rows;
}

function getLabel(taxa: TaxaForm): string {
  if (taxa.modalidade === "debito") return "Débito";
  if (taxa.numero_parcelas === 1) return "Crédito à vista";
  return `Crédito ${taxa.numero_parcelas}x`;
}

export function TaxasCartaoClient({ taxas: initialTaxas }: { taxas: TaxaCartaoRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState<TaxaForm[]>(() => buildInitialForm(initialTaxas));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleChange(index: number, value: string) {
    setForm((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], taxa_percentual: Number(value) || 0 };
      return next;
    });
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      for (const taxa of form) {
        const v = Number(taxa.taxa_percentual);
        if (isNaN(v) || v < 0 || v > 100) {
          throw new Error(`Taxa inválida para ${getLabel(taxa)}: deve ser entre 0 e 100.`);
        }
      }
      await salvarTaxas(
        form.map((t) => ({
          modalidade: t.modalidade,
          bandeira: t.bandeira,
          numero_parcelas: t.numero_parcelas,
          taxa_percentual: Number(t.taxa_percentual),
        }))
      );
      const updated = await fetchTaxasVigentes();
      setForm(buildInitialForm(updated));
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  // Separar por bandeira para exibir em seções
  const visaMaster = form.filter((t) => t.bandeira === "visa_master");
  const outros = form.filter((t) => t.bandeira === "outros");

  function renderTable(title: string, taxas: TaxaForm[], startIndex: number) {
    return (
      <div className="mb-6">
        <h3 className="text-base font-semibold text-neutral-900 mb-3">{title}</h3>
        <table className="min-w-full divide-y divide-neutral-200">
          <thead>
            <tr className="bg-neutral-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-neutral-600">Modalidade</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-neutral-600">Taxa (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {taxas.map((taxa, i) => {
              const globalIndex = startIndex + i;
              return (
                <tr key={`${taxa.bandeira}-${taxa.modalidade}-${taxa.numero_parcelas}`} className="hover:bg-neutral-50">
                  <td className="px-4 py-2 text-sm text-neutral-900">{getLabel(taxa)}</td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={taxa.taxa_percentual}
                      onChange={(e) => handleChange(globalIndex, e.target.value)}
                      className="w-24 rounded-md border border-neutral-300 px-3 py-1.5 text-right text-sm text-neutral-900 focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Taxas Reais de Cartão</h2>
        <p className="mt-1 text-sm text-white/80">
          Configure as taxas reais cobradas pela maquininha por bandeira e modalidade.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>{renderTable("Visa / Mastercard", visaMaster, 0)}</div>
            <div>{renderTable("Outras Bandeiras (Elo, Amex, etc.)", outros, visaMaster.length)}</div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-4 text-sm text-green-600">Taxas salvas com sucesso.</p>}

          <div className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4">
            <p className="text-neutral-500 text-xs">
              Ao salvar, as taxas anteriores serão arquivadas e as novas passarão a valer a partir de hoje.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

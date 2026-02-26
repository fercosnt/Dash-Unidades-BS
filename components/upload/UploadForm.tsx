"use client";

import { useState, useRef } from "react";
import { ClinicaSelect, type ClinicaOption } from "@/components/shared/ClinicaSelect";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { parseXLSXFile, removeHeaderRow, removeTotalizationRow, parseToObjects } from "@/lib/utils/xlsx-parser";
import { transformOrcamentos, transformTratamentos } from "@/lib/utils/xlsx-transforms";
import type { TransformedOrcamentos } from "@/types/upload.types";
import type { TransformedTratamento } from "@/types/upload.types";

export type TipoPlanilha = "orcamentos" | "tratamentos_executados";

export type ParsedResult =
  | { tipo: "orcamentos"; data: TransformedOrcamentos }
  | { tipo: "tratamentos_executados"; data: TransformedTratamento[] };

export type ParsedPayload = {
  result: ParsedResult;
  arquivoNome: string;
  clinicaId: string;
  mesReferencia: string;
  tipoPlanilha: TipoPlanilha;
};

type UploadFormProps = {
  clinicas: ClinicaOption[];
  onParsed: (payload: ParsedPayload) => void;
  disabled?: boolean;
};

export function UploadForm({ clinicas, onParsed, disabled }: UploadFormProps) {
  const [clinicaId, setClinicaId] = useState("");
  const [mesReferencia, setMesReferencia] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [tipo, setTipo] = useState<TipoPlanilha>("orcamentos");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canParse = clinicaId && mesReferencia && tipo && file && !loading;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFile(f ?? null);
    setError(null);
    if (!f) return;

    const ext = f.name.toLowerCase().split(".").pop();
    if (ext !== "xlsx" && ext !== "xls") {
      setError("Aceito apenas arquivos .xlsx ou .xls");
      setFile(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const raw = await parseXLSXFile(f);
      const { headers, rows } = removeHeaderRow(raw as unknown[][]);
      const rowsSemTotal = removeTotalizationRow(rows, headers);
      const objects = parseToObjects(headers, rowsSemTotal);

      if (tipo === "orcamentos") {
        const data = transformOrcamentos(objects, clinicaId, mesReferencia);
        onParsed({ result: { tipo: "orcamentos", data }, arquivoNome: f.name, clinicaId, mesReferencia, tipoPlanilha: "orcamentos" });
      } else {
        const data = transformTratamentos(objects, clinicaId, mesReferencia);
        onParsed({ result: { tipo: "tratamentos_executados", data }, arquivoNome: f.name, clinicaId, mesReferencia, tipoPlanilha: "tratamentos_executados" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao ler a planilha.");
    } finally {
      setLoading(false);
    }
  }

  function triggerFileInput() {
    inputRef.current?.click();
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">Dados do upload</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Clínica parceira *</label>
        <ClinicaSelect
          value={clinicaId}
          onChange={setClinicaId}
          clinicas={clinicas}
          disabled={disabled}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Mês de referência *</label>
        <MonthPicker value={mesReferencia} onChange={setMesReferencia} disabled={disabled} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de planilha *</label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoPlanilha)}
          disabled={disabled}
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-[#0A2463] focus:ring-1 focus:ring-[#0A2463]"
        >
          <option value="orcamentos">Orçamentos</option>
          <option value="tratamentos_executados">Tratamentos executados</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Arquivo *</label>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={disabled || loading}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Lendo…" : file ? file.name : "Selecionar arquivo"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

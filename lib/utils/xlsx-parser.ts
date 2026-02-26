/**
 * Parse de arquivos XLSX no browser (SheetJS)
 */

import * as XLSX from "xlsx";

/** Lê o arquivo e retorna a primeira aba como array de arrays */
export async function parseXLSXFile(file: File): Promise<unknown[][]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", raw: true });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  return data as unknown[][];
}

/** Separa a primeira linha (headers) das demais (rows) */
export function removeHeaderRow(data: unknown[][]): { headers: string[]; rows: unknown[][] } {
  if (data.length === 0) return { headers: [], rows: [] };
  const headers = (data[0] as unknown[]).map((c) => String(c ?? "").trim());
  const rows = data.slice(1).filter((row) => row.some((c) => c != null && String(c).trim() !== ""));
  return { headers, rows };
}

/** Detecta e remove a última linha se for totalizadora (Paciente vazio ou Valor Total / Ticket Médio preenchidos) */
export function removeTotalizationRow(
  rows: unknown[][],
  headers: string[]
): unknown[][] {
  if (rows.length === 0) return rows;
  const last = rows[rows.length - 1] as unknown[];
  const idxPaciente = headers.findIndex((h) => /paciente/i.test(h));
  const idxValorTotal = headers.findIndex((h) => /valor\s*total/i.test(h) && !/desconto/i.test(h));
  const idxTicketMedio = headers.findIndex((h) => /ticket\s*m[eé]dio/i.test(h));

  const pacienteVazio = idxPaciente >= 0 && (last[idxPaciente] == null || String(last[idxPaciente]).trim() === "");
  const temValorTotal = idxValorTotal >= 0 && last[idxValorTotal] != null && String(last[idxValorTotal]).trim() !== "";
  const temTicketMedio = idxTicketMedio >= 0 && last[idxTicketMedio] != null && String(last[idxTicketMedio]).trim() !== "";

  if (pacienteVazio || (temValorTotal && temTicketMedio)) {
    return rows.slice(0, -1);
  }
  return rows;
}

/** Converte arrays em objetos chave-valor usando headers */
export function parseToObjects(headers: string[], rows: unknown[][]): Record<string, string>[] {
  return rows.map((row) => {
    const obj: Record<string, string> = {};
    const arr = row as unknown[];
    headers.forEach((h, i) => {
      const key = h || `col_${i}`;
      obj[key] = arr[i] != null ? String(arr[i]).trim() : "";
    });
    return obj;
  });
}

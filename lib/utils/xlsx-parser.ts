/**
 * Parse de arquivos XLSX no browser (ExcelJS — substitui SheetJS por segurança)
 */

import ExcelJS from "exceljs";

/** Lê o arquivo e retorna a primeira aba como array de arrays */
export async function parseXLSXFile(file: File): Promise<unknown[][]> {
  const ext = (file.name || "").toLowerCase().split(".").pop();
  if (ext === "xls") {
    throw new Error("Por segurança, use apenas arquivos .xlsx (Excel 2007+).");
  }
  const buf = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buf);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const data: unknown[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const values = row.values as unknown[];
    const arr = values.slice(1).map((v) => (v != null && v !== "") ? v : "");
    data.push(arr);
  });
  return data;
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

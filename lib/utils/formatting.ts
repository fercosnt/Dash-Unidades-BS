/**
 * Utilitários de formatação para planilhas Clinicorp (Anexo C)
 */

/** Converte "14.450,00" (BR) para 14450.00 */
export function parseCurrencyBR(value: string): number {
  if (value == null || String(value).trim() === "") return 0;
  const s = String(value).trim().replace(/\s/g, "");
  const normalized = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

/** Converte "DD/MM/YYYY" para "YYYY-MM-DD" */
export function parseDateBR(value: string): string | null {
  if (value == null || String(value).trim() === "") return null;
  const s = String(value).trim();
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const day = d!.padStart(2, "0");
  const month = m!.padStart(2, "0");
  return `${y}-${month}-${day}`;
}

/** Remove número entre parênteses no final: "Fabio Sakuma (18)" → "Fabio Sakuma" */
export function cleanPatientName(name: string): string {
  if (name == null) return "";
  return String(name).replace(/\s*\(\d+\)\s*$/, "").trim();
}

/** Retorna true se "Como conheceu?" contém "Indicado por" */
export function detectIndication(comoConheceu: string): boolean {
  if (comoConheceu == null) return false;
  return /indicado\s+por/i.test(String(comoConheceu).trim());
}

/** Formata número como moeda BR (exibição) */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

/** Formata data ISO para exibição BR */
export function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  try {
    return new Date(isoDate + "T12:00:00").toLocaleDateString("pt-BR");
  } catch {
    return isoDate;
  }
}

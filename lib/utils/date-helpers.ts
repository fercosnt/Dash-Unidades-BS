/**
 * Returns the first day of a month in YYYY-MM-DD format.
 * @param mes - Month in "YYYY-MM" format
 */
export function firstDayOfMonth(mes: string): string {
  return `${mes}-01`;
}

/**
 * Returns the last day of a month in YYYY-MM-DD format.
 * @param mes - Month in "YYYY-MM" format
 */
export function lastDayOfMonth(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${mes}-${String(lastDay).padStart(2, "0")}`;
}

/**
 * Match de nome da planilha com procedimentos cadastrados.
 * Usado no upload e na revisão para vincular automaticamente.
 */

export type ProcedimentoMatch = { id: string; nome: string };

function normalize(s: string): string {
  return (s ?? "").trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Encontra um procedimento na lista pelo nome do tratamento.
 * 1) Match exato (trim + case-insensitive + sem acento)
 * 2) Nome do procedimento começa com o nome do tratamento
 * 3) Nome do tratamento começa com o nome do procedimento
 */
export function matchProcedimentoPorNome(
  procedimentoNomePlanilha: string,
  procedimentos: ProcedimentoMatch[]
): ProcedimentoMatch | null {
  const key = normalize(procedimentoNomePlanilha);
  if (!key) return null;

  for (const p of procedimentos) {
    const pKey = normalize(p.nome);
    if (pKey === key) return p;
  }
  for (const p of procedimentos) {
    const pKey = normalize(p.nome);
    if (pKey.startsWith(key) || key.startsWith(pKey)) return p;
  }
  return null;
}

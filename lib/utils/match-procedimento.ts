/**
 * Match de nome da planilha com procedimentos cadastrados.
 * Usado no upload e na revisão para vincular automaticamente.
 */

export type ProcedimentoMatch = { id: string; nome: string; codigo_clinicorp?: string | null };

function normalize(s: string): string {
  return (s ?? "").trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Encontra um procedimento na lista pelo nome do tratamento.
 * 1) Match exato por codigo_clinicorp (texto original do Clinicorp)
 * 2) Match exato por nome (trim + case-insensitive + sem acento)
 * 3) Nome do procedimento começa com o nome do tratamento ou vice-versa
 * 4) Codigo clinicorp começa com o nome do tratamento ou vice-versa
 */
export function matchProcedimentoPorNome(
  procedimentoNomePlanilha: string,
  procedimentos: ProcedimentoMatch[]
): ProcedimentoMatch | null {
  const key = normalize(procedimentoNomePlanilha);
  if (!key) return null;

  // 1) Match exato por codigo_clinicorp
  for (const p of procedimentos) {
    if (p.codigo_clinicorp) {
      const cKey = normalize(p.codigo_clinicorp);
      if (cKey === key) return p;
    }
  }
  // 2) Match exato por nome
  for (const p of procedimentos) {
    const pKey = normalize(p.nome);
    if (pKey === key) return p;
  }
  // 3) Prefixo por nome
  for (const p of procedimentos) {
    const pKey = normalize(p.nome);
    if (pKey.startsWith(key) || key.startsWith(pKey)) return p;
  }
  // 4) Prefixo por codigo_clinicorp
  for (const p of procedimentos) {
    if (p.codigo_clinicorp) {
      const cKey = normalize(p.codigo_clinicorp);
      if (cKey.startsWith(key) || key.startsWith(cKey)) return p;
    }
  }
  return null;
}

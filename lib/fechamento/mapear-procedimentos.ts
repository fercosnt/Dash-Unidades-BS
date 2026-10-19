/**
 * Mapeia as linhas da planilha "Procedimentos Executados" (Clinicorp) para o catálogo
 * de procedimentos usando `regras_procedimento`.
 *
 * Função pura: não acessa banco. Quem chama passa regras e catálogo.
 *   - "+" na descrição vira múltiplos procedimentos (regra de import do projeto)
 *   - a primeira regra que casar vence (prioridade crescente; regra da clínica antes da global)
 *   - texto sem regra vira "ambígua" (o plugin pergunta ao usuário e pode criar regra nova)
 *   - mesmo paciente + dia + procedimento mais de uma vez vira "possível duplicata" (não remove)
 */

export type LinhaPlanilha = {
  data: string; // YYYY-MM-DD
  paciente: string;
  procedimento: string;
  valor?: number;
  profissional?: string;
};

export type RegraProcedimento = {
  id: string;
  padrao: string;
  procedimento_id: string | null;
  ignorar: boolean;
  prioridade: number;
  clinica_id: string | null;
};

export type ProcedimentoCatalogo = {
  id: string;
  nome: string;
  custo_fixo: number;
};

export type LinhaMapeada = {
  data: string;
  paciente: string;
  texto_original: string;
  parte: string;
  procedimento_id: string;
  procedimento_nome: string;
  custo: number;
  regra_id: string;
  valor: number;
  profissional?: string;
};

export type LinhaIgnorada = {
  data: string;
  paciente: string;
  parte: string;
  regra_id: string;
};

export type LinhaAmbigua = {
  data: string;
  paciente: string;
  texto_original: string;
  parte: string;
};

export type PossivelDuplicata = {
  paciente: string;
  data: string;
  procedimento_nome: string;
  partes: string[];
};

export type ResultadoMapeamento = {
  mapeadas: LinhaMapeada[];
  ignoradas: LinhaIgnorada[];
  ambiguas: LinhaAmbigua[];
  possiveisDuplicatas: PossivelDuplicata[];
  custoTotal: number;
};

export function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function ordenarRegras(regras: RegraProcedimento[], clinicaId: string | null): RegraProcedimento[] {
  return regras
    .filter((r) => r.clinica_id === null || r.clinica_id === clinicaId)
    .sort((a, b) => {
      if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
      // Mesma prioridade: regra específica da clínica vence a global
      return (a.clinica_id ? 0 : 1) - (b.clinica_id ? 0 : 1);
    });
}

export function mapearProcedimentos(
  linhas: LinhaPlanilha[],
  regras: RegraProcedimento[],
  catalogo: ProcedimentoCatalogo[],
  clinicaId: string | null = null
): ResultadoMapeamento {
  const regrasOrdenadas = ordenarRegras(regras, clinicaId).map((r) => ({
    ...r,
    padraoNorm: normalizarTexto(r.padrao),
  }));
  const procPorId = new Map(catalogo.map((p) => [p.id, p]));

  const mapeadas: LinhaMapeada[] = [];
  const ignoradas: LinhaIgnorada[] = [];
  const ambiguas: LinhaAmbigua[] = [];

  for (const linha of linhas) {
    const partes = linha.procedimento
      .split("+")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    for (const parte of partes) {
      const parteNorm = normalizarTexto(parte);
      const regra = regrasOrdenadas.find((r) => parteNorm.includes(r.padraoNorm));

      if (!regra) {
        ambiguas.push({ data: linha.data, paciente: linha.paciente, texto_original: linha.procedimento, parte });
        continue;
      }
      if (regra.ignorar) {
        ignoradas.push({ data: linha.data, paciente: linha.paciente, parte, regra_id: regra.id });
        continue;
      }

      const proc = regra.procedimento_id ? procPorId.get(regra.procedimento_id) : undefined;
      if (!proc) {
        // Regra aponta para procedimento inativo/removido: trata como ambígua
        ambiguas.push({ data: linha.data, paciente: linha.paciente, texto_original: linha.procedimento, parte });
        continue;
      }

      mapeadas.push({
        data: linha.data,
        paciente: linha.paciente,
        texto_original: linha.procedimento,
        parte,
        procedimento_id: proc.id,
        procedimento_nome: proc.nome,
        custo: proc.custo_fixo,
        regra_id: regra.id,
        valor: linha.valor ?? 0,
        profissional: linha.profissional,
      });
    }
  }

  const grupos = new Map<string, LinhaMapeada[]>();
  for (const m of mapeadas) {
    const chave = `${normalizarTexto(m.paciente)}|${m.data}|${m.procedimento_id}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), m]);
  }
  const possiveisDuplicatas: PossivelDuplicata[] = [...grupos.values()]
    .filter((g) => g.length > 1)
    .map((g) => ({
      paciente: g[0]!.paciente,
      data: g[0]!.data,
      procedimento_nome: g[0]!.procedimento_nome,
      partes: g.map((m) => m.parte),
    }));

  const custoTotal = Math.round(mapeadas.reduce((s, m) => s + m.custo, 0) * 100) / 100;

  return { mapeadas, ignoradas, ambiguas, possiveisDuplicatas, custoTotal };
}

/**
 * Funções puras do conector MCP do fechamento: resolução de nomes (clínica, médico,
 * procedimento, categoria), normalização/validação das linhas da planilha enviadas pelo
 * Claude e montagem das linhas finais de procedimentos. Sem banco, sem SDK — testáveis.
 */
import type { LinhaPlanilha, ResultadoMapeamento } from "@/lib/fechamento/mapear-procedimentos";

/** Erro de entrada da pessoa/Claude (nome não encontrado, linha inválida…): mensagem em PT, sem log. */
export class ErroFerramenta extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErroFerramenta";
  }
}

export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve por id, nome exato (sem acento/caixa) ou trecho único do nome. */
export function resolverPorNome<T extends { id: string; nome: string }>(lista: T[], termo: string, oQue: string): T {
  if (UUID.test(termo)) {
    const porId = lista.find((x) => x.id === termo);
    if (porId) return porId;
  }
  const t = normalizar(termo);
  const exato = lista.filter((x) => normalizar(x.nome) === t);
  if (exato.length === 1) return exato[0]!;
  const parcial = lista.filter((x) => normalizar(x.nome).includes(t));
  if (parcial.length === 1) return parcial[0]!;
  const opcoes = (parcial.length ? parcial : lista).map((x) => x.nome).join(" | ");
  throw new ErroFerramenta(`${oQue} "${termo}" ${parcial.length ? "ambígua" : "não encontrada"}. Opções: ${opcoes}`);
}

/** Clínica por subscriber_id do Clinicorp, id ou nome. */
export function resolverClinica<T extends { id: string; nome: string; clinicorp_subscriber_id: string | null }>(
  clinicas: T[],
  termo: string
): T {
  const porSubscriber = clinicas.find(
    (c) => c.clinicorp_subscriber_id && normalizar(c.clinicorp_subscriber_id) === normalizar(termo)
  );
  return porSubscriber ?? resolverPorNome(clinicas, termo, "Clínica");
}

/** "Felipe Ferreira Ahouagi (56)" -> "Felipe Ferreira Ahouagi" (código do paciente no Clinicorp). */
export function limparPaciente(nome: string): string {
  return nome.replace(/\s*\(\d+\)\s*$/, "").trim();
}

/** Aceita YYYY-MM-DD (padrão) ou dd/mm/aaaa; devolve YYYY-MM-DD ou null. */
export function normalizarData(s: string): string | null {
  const t = s.trim();
  const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null;
}

/**
 * Normaliza as linhas enviadas pelo Claude (data, nome do paciente sem código) e exige
 * que todas sejam do mês do fechamento.
 */
export function prepararLinhasDoMes(linhas: LinhaPlanilha[], mes: string): LinhaPlanilha[] {
  if (!linhas.length) throw new ErroFerramenta("Nenhuma linha recebida. Leia a planilha 'Procedimentos Executados' e envie as linhas.");
  const preparadas = linhas.map((l, i) => {
    const data = normalizarData(l.data);
    if (!data) throw new ErroFerramenta(`Linha ${i + 1}: data inválida "${l.data}" (use YYYY-MM-DD).`);
    return { ...l, data, paciente: limparPaciente(l.paciente), procedimento: l.procedimento.trim() };
  });
  const fora = preparadas.filter((l) => !l.data.startsWith(mes));
  if (fora.length) {
    throw new ErroFerramenta(`${fora.length} linha(s) fora de ${mes} (ex.: ${fora[0]!.data}). Confira se a planilha é do mês certo.`);
  }
  return preparadas;
}

export type Resolucao = { data: string; paciente: string; parte: string; procedimento: string | null };
export type Remocao = { data: string; paciente: string; parte: string };

export type LinhaFinal = {
  data: string;
  paciente: string;
  procedimento_id: string;
  nome: string;
  custo: number;
  texto_original: string;
  profissional?: string;
  valor: number;
};

const chaveLinha = (l: { data: string; paciente: string; parte: string }) =>
  `${l.data}|${normalizar(limparPaciente(l.paciente))}|${normalizar(l.parte)}`;

/**
 * Junta o mapeamento automático com as decisões da pessoa: toda ambígua precisa de
 * resolução (procedimento ou null = ignorar) e as duplicatas confirmadas saem via `remover`.
 */
export function montarProcedimentosFinais(
  mapeamento: ResultadoMapeamento,
  linhas: LinhaPlanilha[],
  resolucoes: Resolucao[],
  remover: Remocao[],
  procedimentos: { id: string; nome: string; custo_fixo: number | string }[]
): LinhaFinal[] {
  const resolvidas = new Map(resolucoes.map((x) => [chaveLinha(x), x]));
  const pendentes = mapeamento.ambiguas.filter((a) => !resolvidas.has(chaveLinha(a)));
  if (pendentes.length) {
    throw new ErroFerramenta(
      `Faltam resolver ${pendentes.length} linha(s) ambígua(s): ` +
        pendentes.map((p) => `${p.data} ${p.paciente}: "${p.parte}"`).join("; ")
    );
  }

  const removerSet = new Set(remover.map(chaveLinha));
  const finais: LinhaFinal[] = mapeamento.mapeadas
    .filter((m) => !removerSet.has(chaveLinha(m)))
    .map((m) => ({
      data: m.data,
      paciente: m.paciente,
      procedimento_id: m.procedimento_id,
      nome: m.procedimento_nome,
      custo: m.custo,
      texto_original: m.texto_original,
      profissional: m.profissional,
      valor: m.valor,
    }));

  for (const a of mapeamento.ambiguas) {
    const res = resolvidas.get(chaveLinha(a))!;
    if (res.procedimento === null) continue;
    const proc = resolverPorNome(procedimentos, res.procedimento, "Procedimento");
    const original = linhas.find((l) => l.data === a.data && l.paciente === a.paciente && l.procedimento === a.texto_original);
    finais.push({
      data: a.data,
      paciente: a.paciente,
      procedimento_id: proc.id,
      nome: proc.nome,
      custo: Number(proc.custo_fixo),
      texto_original: a.texto_original,
      profissional: original?.profissional,
      valor: original?.valor ?? 0,
    });
  }
  return finais;
}

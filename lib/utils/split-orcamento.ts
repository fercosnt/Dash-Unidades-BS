/**
 * Logica pura de desmembramento de orcamentos.
 * Separa procedimentos_texto (ex: "Implante + Abutment + Coroa")
 * em itens individuais, precifica pela tabela de valores e distribui desconto.
 */

import { matchProcedimentoPorNome } from "./match-procedimento";

export type ProcedimentoRef = {
  id: string;
  nome: string;
  codigo_clinicorp?: string | null;
  valor_tabela: number;
  categoria: string | null;
};

export type SplitItem = {
  procedimento_nome_original: string;
  procedimento_id: string | null;
  valor_tabela: number;
  valor_proporcional: number;
  categoria: string | null;
  match_status: "auto" | "unmatched";
};

export type SplitResult = {
  items: SplitItem[];
  soma_valor_tabela: number;
  valor_total_orcamento: number;
  desconto_aplicado: number;
  divergencia: number;
  divergencia_percentual: number;
};

export type OrcamentoParaSplit = {
  id: string;
  clinica_id: string;
  procedimentos_texto: string | null;
  valor_total: number;
  valor_bruto: number | null;
  desconto_reais: number | null;
};

/**
 * Parseia o texto de procedimentos, splitando por "+" ou ","
 */
function parseProcedimentosTexto(texto: string): string[] {
  return texto
    .split(/[+,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Distribui desconto proporcionalmente entre itens com base no valor_tabela.
 * Centavos residuais vao no ultimo item (mesmo padrao de parcelas).
 */
function distribuirDesconto(
  items: SplitItem[],
  valorTotal: number
): SplitItem[] {
  const somaTabela = items.reduce((acc, it) => acc + it.valor_tabela, 0);

  // Se nenhum item tem valor_tabela, distribui igualmente
  if (somaTabela <= 0) {
    const qtde = items.length;
    if (qtde === 0) return items;
    const valorPorItem = Math.floor((valorTotal / qtde) * 100) / 100;
    const somaDistribuida = valorPorItem * (qtde - 1);
    return items.map((it, i) => ({
      ...it,
      valor_proporcional:
        i === qtde - 1
          ? Math.round((valorTotal - somaDistribuida) * 100) / 100
          : valorPorItem,
    }));
  }

  // Distribuicao proporcional
  let somaDistribuida = 0;
  const result = items.map((it, i) => {
    if (i === items.length - 1) {
      // Ultimo item recebe o restante (corrige centavos)
      const valorProporcional =
        Math.round((valorTotal - somaDistribuida) * 100) / 100;
      return { ...it, valor_proporcional: valorProporcional };
    }
    const proporcao = it.valor_tabela / somaTabela;
    const valorProporcional = Math.round(valorTotal * proporcao * 100) / 100;
    somaDistribuida += valorProporcional;
    return { ...it, valor_proporcional: valorProporcional };
  });

  return result;
}

/**
 * Desmembra um orcamento em itens individuais.
 */
export function splitOrcamento(
  orcamento: OrcamentoParaSplit,
  procedimentos: ProcedimentoRef[]
): SplitResult {
  const texto = orcamento.procedimentos_texto?.trim();

  // Caso sem procedimentos_texto
  if (!texto) {
    return {
      items: [
        {
          procedimento_nome_original: "(Nao especificado)",
          procedimento_id: null,
          valor_tabela: 0,
          valor_proporcional: orcamento.valor_total,
          categoria: null,
          match_status: "unmatched",
        },
      ],
      soma_valor_tabela: 0,
      valor_total_orcamento: orcamento.valor_total,
      desconto_aplicado: 0,
      divergencia: 0,
      divergencia_percentual: 0,
    };
  }

  const partes = parseProcedimentosTexto(texto);

  // Caso tratamento unico
  if (partes.length === 0) {
    return {
      items: [
        {
          procedimento_nome_original: texto,
          procedimento_id: null,
          valor_tabela: 0,
          valor_proporcional: orcamento.valor_total,
          categoria: null,
          match_status: "unmatched",
        },
      ],
      soma_valor_tabela: 0,
      valor_total_orcamento: orcamento.valor_total,
      desconto_aplicado: 0,
      divergencia: 0,
      divergencia_percentual: 0,
    };
  }

  // Match cada parte com procedimentos cadastrados (inclui codigo_clinicorp para match)
  const matchList = procedimentos.map((p) => ({ id: p.id, nome: p.nome, codigo_clinicorp: p.codigo_clinicorp }));
  const items: SplitItem[] = partes.map((parte) => {
    const match = matchProcedimentoPorNome(parte, matchList);
    const proc = match
      ? procedimentos.find((p) => p.id === match.id)
      : null;
    return {
      procedimento_nome_original: parte,
      procedimento_id: proc?.id ?? null,
      valor_tabela: proc?.valor_tabela ?? 0,
      valor_proporcional: 0,
      categoria: proc?.categoria ?? null,
      match_status: proc ? ("auto" as const) : ("unmatched" as const),
    };
  });

  const somaTabela = items.reduce((acc, it) => acc + it.valor_tabela, 0);

  // Distribuir valor_total proporcionalmente
  const itemsDistribuidos = distribuirDesconto(items, orcamento.valor_total);

  // Calcular divergencia (diferenca entre soma da tabela e valor bruto ou total)
  const valorReferencia = orcamento.valor_bruto ?? orcamento.valor_total;
  const divergencia =
    somaTabela > 0
      ? Math.round((somaTabela - valorReferencia) * 100) / 100
      : 0;
  const divergenciaPercentual =
    somaTabela > 0 && valorReferencia > 0
      ? Math.round(((somaTabela - valorReferencia) / valorReferencia) * 10000) /
        100
      : 0;

  const desconto =
    orcamento.desconto_reais ??
    (somaTabela > 0 ? somaTabela - orcamento.valor_total : 0);

  return {
    items: itemsDistribuidos,
    soma_valor_tabela: somaTabela,
    valor_total_orcamento: orcamento.valor_total,
    desconto_aplicado: Math.round(desconto * 100) / 100,
    divergencia,
    divergencia_percentual: divergenciaPercentual,
  };
}

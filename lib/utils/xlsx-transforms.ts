/**
 * Transformações de dados da planilha para o schema do banco (Anexo C)
 */

import { parseCurrencyBR, parseDateBR, cleanPatientName, detectIndication } from "@/lib/utils/formatting";
import type {
  TransformedOrcamentoFechado,
  TransformedOrcamentoAberto,
  TransformedTratamento,
  TransformedOrcamentos,
} from "@/types/upload.types";

function getCol(row: Record<string, string>, ...names: string[]): string {
  const raw = Object.entries(row).find(([k]) => {
    const kLower = k.trim().toLowerCase();
    return names.some((n) => n.trim().toLowerCase() === kLower || kLower.includes(n.trim().toLowerCase()));
  });
  return raw ? (raw[1] ?? "").trim() : "";
}

/** Separa orçamentos fechados (APPROVED) e abertos (demais), aplica transformações Anexo C.1 */
export function transformOrcamentos(
  rows: Record<string, string>[],
  _clinicaId: string,
  mesReferencia: string
): TransformedOrcamentos {
  const fechados: TransformedOrcamentoFechado[] = [];
  const abertos: TransformedOrcamentoAberto[] = [];

  for (const row of rows) {
    const status = getCol(row, "Status", "status");
    const pacienteRaw = getCol(row, "Paciente", "paciente");
    const paciente_nome = cleanPatientName(pacienteRaw);
    const valorTotalStr = getCol(row, "Valor Total Com Desconto", "Valor Total Com Desconto", "Valor Total");
    const valor_total = parseCurrencyBR(valorTotalStr);
    const dataCriacao = getCol(row, "Data Criação", "Data Criação", "Data Criacao", "Data");
    const dataFechamento = parseDateBR(dataCriacao);
    const comoConheceu = getCol(row, "Como conheceu?", "Como conheceu");
    const tem_indicacao = detectIndication(comoConheceu);

    if (status.toUpperCase() === "APPROVED") {
      fechados.push({
        paciente_nome,
        valor_total,
        data_fechamento: dataFechamento,
        tem_indicacao,
        profissional: getCol(row, "Profissional", "profissional") || undefined,
        paciente_telefone: getCol(row, "Telefone", "telefone") || undefined,
        procedimentos_texto: getCol(row, "Procedimentos", "procedimentos") || undefined,
        valor_bruto: parseCurrencyBR(getCol(row, "Valor", "valor")) || undefined,
        desconto_percentual: parseCurrencyBR(getCol(row, "Desconto-Porcentagem", "Desconto-Porcentagem")) || undefined,
        desconto_reais: parseCurrencyBR(getCol(row, "Desconto-Reais", "Desconto-Reais")) || undefined,
        observacoes: getCol(row, "Observações", "Observacoes", "observacoes") || undefined,
      });
    } else {
      abertos.push({
        paciente_nome,
        valor_total,
        data_criacao: dataFechamento,
        status: status || "aberto",
        profissional: getCol(row, "Profissional", "profissional") || undefined,
      });
    }
  }

  return { fechados, abertos };
}

/** Transforma tratamentos: split por "+" na coluna Procedimento (Anexo C.2) */
export function transformTratamentos(
  rows: Record<string, string>[],
  _clinicaId: string,
  _mesReferencia: string
): TransformedTratamento[] {
  const result: TransformedTratamento[] = [];

  for (const row of rows) {
    const paciente_nome = cleanPatientName(getCol(row, "Paciente", "paciente"));
    const procedimentoCol = getCol(row, "Procedimento", "procedimento");
    const dataStr = getCol(row, "Executado", "executado", "Data", "Data Execução");
    const data_execucao = parseDateBR(dataStr);
    const valor = parseCurrencyBR(getCol(row, "Valor", "valor"));
    const partes = procedimentoCol
      .split("+")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (partes.length === 0) {
      result.push({
        paciente_nome,
        procedimento_nome: procedimentoCol || "(vazio)",
        data_execucao,
        quantidade: 1,
        valor: valor || 0,
        profissional: getCol(row, "Profissional", "profissional") || undefined,
        regiao: getCol(row, "Região", "Regiao", "regiao") || undefined,
      });
    } else {
      for (const nome of partes) {
        result.push({
          paciente_nome,
          procedimento_nome: nome,
          data_execucao,
          quantidade: 1,
          valor: valor || 0,
          profissional: getCol(row, "Profissional", "profissional") || undefined,
          regiao: getCol(row, "Região", "Regiao", "regiao") || undefined,
        });
      }
    }
  }

  return result;
}

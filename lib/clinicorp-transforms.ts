/**
 * Transformações de dados da API Clinicorp para o formato do Supabase.
 */

import type {
  ClinicorpEstimate,
  ClinicorpPayment,
} from "@/types/clinicorp.types";
import type { TransformedTratamento } from "@/types/upload.types";
import { cleanPatientName } from "@/lib/utils/formatting";

// --- Mapeamento de forma de pagamento ---

const FORMA_MAP: Record<string, string> = {
  "Cartão de Crédito": "cartao_credito",
  "Cartão de Débito": "cartao_debito",
  Pix: "pix",
  Dinheiro: "dinheiro",
  Boleto: "boleto",
  Transferência: "transferencia",
};

// Bandeiras que entram como visa_master; qualquer outra = outros
const VISA_MASTER_FLAGS = new Set(["VISA", "MASTERCARD"]);

// --- Orçamentos ---

export interface TransformedClinicorpOrcamentoFechado {
  paciente_nome: string;
  valor_total: number;
  data_fechamento: string | null;
  profissional: string | null;
  paciente_telefone: string | null;
  procedimentos_texto: string | null;
  valor_bruto: number | null;
  desconto_percentual: number | null;
  tem_indicacao: boolean;
  clinicorp_treatment_id: number;
  origem: "clinicorp";
}

export interface TransformedClinicorpOrcamentoAberto {
  paciente_nome: string;
  valor_total: number;
  data_criacao: string | null;
  status: string;
  profissional: string | null;
  clinicorp_treatment_id: number;
  origem: "clinicorp";
}

export interface TransformedClinicorpPagamento {
  valor: number;
  forma: string;
  parcelas: number;
  data_pagamento: string;
  bandeira: string | null;
  clinicorp_payment_id: number;
  clinicorp_treatment_id: number; // para vincular ao orçamento
  origem: "clinicorp";
}

// --- Funções de transformação ---

function extractDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  // API retorna ISO ("2026-02-15T10:30:00.000Z") — extrair YYYY-MM-DD
  return isoDate.slice(0, 10);
}

function mapBandeira(flag: string | undefined | null): string | null {
  if (!flag) return null;
  return VISA_MASTER_FLAGS.has(flag.toUpperCase()) ? "visa_master" : "outros";
}

function mapStatusAberto(
  status: string
): string {
  switch (status) {
    case "OPEN":
      return "aberto";
    case "FOLLOW_UP":
      return "follow_up";
    case "REJECTED":
      return "rejeitado";
    default:
      return "aberto";
  }
}

/**
 * Separa orçamentos da API em fechados (APPROVED) e abertos (demais).
 */
export function transformEstimates(estimates: ClinicorpEstimate[]): {
  fechados: TransformedClinicorpOrcamentoFechado[];
  abertos: TransformedClinicorpOrcamentoAberto[];
} {
  const fechados: TransformedClinicorpOrcamentoFechado[] = [];
  const abertos: TransformedClinicorpOrcamentoAberto[] = [];

  for (const est of estimates) {
    const nome = cleanPatientName(est.PatientName);

    if (est.Status === "APPROVED") {
      // Calcular valor bruto (soma dos OriginalAmount dos procedimentos)
      const valorBruto =
        est.ProcedureList?.reduce((sum, p) => sum + (p.OriginalAmount ?? 0), 0) ??
        null;

      // Juntar descrições dos procedimentos
      const procTexto =
        est.ProcedureList?.map((p) => p.OperationDescription || p.ProcedureName)
          .filter(Boolean)
          .join(", ") || null;

      fechados.push({
        paciente_nome: nome,
        valor_total: est.Amount,
        data_fechamento: extractDate(est.CreateDate),
        profissional: est.ProfessionalName || null,
        paciente_telefone: est.PatientMobilePhone || null,
        procedimentos_texto: procTexto,
        valor_bruto: valorBruto,
        desconto_percentual: est.DiscountPercentage ?? null,
        tem_indicacao: false, // API não tem — admin preenche depois
        clinicorp_treatment_id: est.TreatmentId,
        origem: "clinicorp",
      });
    } else {
      abertos.push({
        paciente_nome: nome,
        valor_total: est.Amount,
        data_criacao: extractDate(est.CreateDate),
        status: mapStatusAberto(est.Status),
        profissional: est.ProfessionalName || null,
        clinicorp_treatment_id: est.TreatmentId,
        origem: "clinicorp",
      });
    }
  }

  return { fechados, abertos };
}

/**
 * Extrai tratamentos executados dos StepsList dos estimates.
 * Filtra steps com Executed="X" e ExecutedDate no mês de referência.
 * Cortesias (Amount=0) são incluídas — aparecem com "CORTESIA" no StepDescription.
 */
export function transformTratamentosExecutados(
  estimates: ClinicorpEstimate[],
  mesReferencia: string
): TransformedTratamento[] {
  const mesPrefix = mesReferencia.slice(0, 7); // "YYYY-MM"
  const result: TransformedTratamento[] = [];

  for (const est of estimates) {
    if (!est.StepsList?.length) continue;
    const nome = cleanPatientName(est.PatientName);

    for (const step of est.StepsList) {
      if (step.Executed !== "X" || !step.ExecutedDate) continue;

      const execDate = extractDate(step.ExecutedDate);
      if (!execDate || !execDate.startsWith(mesPrefix)) continue;

      result.push({
        paciente_nome: nome,
        procedimento_nome: step.StepDescription,
        data_execucao: execDate,
        quantidade: 1,
        profissional: step.ProfessionalName || undefined,
      });
    }
  }

  return result;
}

/**
 * Agrupa parcelas de pagamento por PaymentHeaderId e transforma para o formato Supabase.
 * Na API Clinicorp, cada parcela de cartão é 1 registro separado.
 * No Supabase, pagamento é 1 registro com parcelas: N e valor: total.
 */
export function transformPayments(
  payments: ClinicorpPayment[]
): TransformedClinicorpPagamento[] {
  // Agrupar por PaymentHeaderId
  const groups = new Map<number, ClinicorpPayment[]>();

  for (const p of payments) {
    const key = p.PaymentHeaderId;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(p);
  }

  const result: TransformedClinicorpPagamento[] = [];

  for (const [headerId, parcelas] of groups) {
    // Pegar a primeira parcela como referência (parcela 0 tem TotalPostAmount)
    const first = parcelas.find((p) => p.InstallmentNumber === 0) ?? parcelas[0];

    // Valor total: TotalPostAmount (da parcela 0) ou soma dos Amount
    const valorTotal =
      first.TotalPostAmount ??
      parcelas.reduce((sum, p) => sum + p.Amount, 0);

    const forma = FORMA_MAP[first.PaymentForm];
    if (!forma) {
      // Forma desconhecida — pular
      console.error(
        `[clinicorp-transforms] Forma de pagamento desconhecida: "${first.PaymentForm}" (PaymentHeaderId: ${headerId})`
      );
      continue;
    }

    const isCartao = forma === "cartao_credito" || forma === "cartao_debito";

    result.push({
      valor: valorTotal,
      forma,
      parcelas: first.InstallmentsCount || 1,
      data_pagamento: extractDate(first.CheckOutDate) ?? extractDate(first.DueDate) ?? "",
      bandeira: isCartao ? mapBandeira(first.CreditDebitCardFlag) : null,
      clinicorp_payment_id: headerId,
      clinicorp_treatment_id: first.TreatmentId,
      origem: "clinicorp",
    });
  }

  return result;
}

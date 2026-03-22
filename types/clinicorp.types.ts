/** Tipos das respostas da API Clinicorp (baseados em dados reais validados em 2026-03-21) */

// --- Orçamentos (GET /estimates/list) ---

export interface ClinicorpProcedure {
  ProcedureName: string;
  ProcedureExpertiseName: string;
  OriginalAmount: number;
  OperationDescription: string;
  Amount: number;
}

export interface ClinicorpEstimateStep {
  StepDescription: string;
  Executed: string; // "X" | ""
  ExecutedDate: string | null;
  ProfessionalName: string;
}

export interface ClinicorpEstimate {
  id: number;
  TreatmentId: number;
  PatientName: string;
  PatientId: number;
  PatientMobilePhone: string;
  Amount: number;
  Status: "APPROVED" | "OPEN" | "FOLLOW_UP" | "REJECTED";
  CreateDate: string; // ISO
  BusinessId: number;
  ProfessionalId: number;
  ProfessionalName: string;
  DiscountPercentage?: number;
  ProcedureList: ClinicorpProcedure[];
  StepsList?: ClinicorpEstimateStep[];
}

// --- Pagamentos (GET /payment/list) ---

export interface ClinicorpPayment {
  id: number;
  PaymentHeaderId: number;
  PatientName: string;
  PatientId: number;
  Amount: number;
  PaymentForm: string; // "Cartão de Crédito" | "Cartão de Débito" | "Pix" | "Dinheiro"
  Type: string; // "CREDIT_CARD_EXTERNAL" | "DEBIT_CARD_EXTERNAL" | "PIX_EXTERNAL" | "CASH"
  CreditDebitCardFlag?: string; // "VISA" | "MASTERCARD" | "ELO" | "AMEX" | "HIPERCARD"
  InstallmentsCount: number;
  InstallmentNumber: number;
  TotalPostAmount?: number; // só na parcela 0
  DueDate: string;
  CheckOutDate: string;
  PaymentReceived: string; // "X" | ""
  PaymentConfirmed: string; // "X" | ""
  TreatmentId: number;
  Last4Digits?: string;
  AmountWithDiscounts: number;
  OwnerName?: string;
  OwnerCPF?: string;
  AuthorizationCode?: string;
}

// --- Respostas da API ---

export interface ClinicorpListResponse<T> {
  data: T[];
  total?: number;
}

// --- Credenciais ---

export interface ClinicorpCredentials {
  subscriberId: string;
  username: string;
  token: string;
  businessId: string;
}

// --- Mapeamentos ---

export type FormaPagamentoClinicorp =
  | "Cartão de Crédito"
  | "Cartão de Débito"
  | "Pix"
  | "Dinheiro"
  | "Boleto"
  | "Transferência";

export type BandeiraClinicorp =
  | "VISA"
  | "MASTERCARD"
  | "ELO"
  | "AMEX"
  | "HIPERCARD";

// --- Sync ---

export interface ClinicorpSyncRequest {
  clinica_id: string;
  mes_referencia: string; // "YYYY-MM-01"
  dry_run?: boolean;
}

export interface ClinicorpSyncPreview {
  orcamentos_fechados: number;
  orcamentos_abertos: number;
  pagamentos: number;
  tratamentos_executados: number;
  detalhes: {
    fechados: Array<{ paciente: string; valor: number; profissional: string }>;
    pagamentos: Array<{ paciente: string; valor: number; forma: string }>;
    tratamentos: Array<{ paciente: string; procedimento: string; data: string }>;
  };
}

export interface ClinicorpSyncResult {
  orcamentos_fechados_inseridos: number;
  orcamentos_fechados_ignorados: number;
  orcamentos_abertos_inseridos: number;
  orcamentos_abertos_ignorados: number;
  pagamentos_inseridos: number;
  pagamentos_ignorados: number;
  tratamentos_inseridos: number;
}

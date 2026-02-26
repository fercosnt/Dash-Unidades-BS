/** Tipos para upload e processamento de planilhas (Fase 2) */

export type TipoPlanilha = "orcamentos" | "tratamentos_executados";

/** Dados transformados para orçamento fechado (status APPROVED) */
export interface TransformedOrcamentoFechado {
  paciente_nome: string;
  valor_total: number;
  data_fechamento: string | null;
  profissional?: string;
  paciente_telefone?: string;
  procedimentos_texto?: string;
  valor_bruto?: number;
  desconto_percentual?: number;
  desconto_reais?: number;
  observacoes?: string;
  tem_indicacao: boolean;
}

/** Dados transformados para orçamento aberto (status != APPROVED) */
export interface TransformedOrcamentoAberto {
  paciente_nome: string;
  valor_total: number;
  data_criacao: string | null;
  status?: string;
  profissional?: string;
}

/** Dados transformados para tratamento executado */
export interface TransformedTratamento {
  paciente_nome: string;
  procedimento_nome: string;
  data_execucao: string | null;
  quantidade: number;
  profissional?: string;
  regiao?: string;
  valor?: number;
}

/** Resultado do parse de orçamentos: fechados + abertos */
export interface TransformedOrcamentos {
  fechados: TransformedOrcamentoFechado[];
  abertos: TransformedOrcamentoAberto[];
}

/** Payload enviado para a API de upload (um tipo por vez) */
export interface UploadPayload {
  clinica_id: string;
  mes_referencia: string;
  tipo: "orcamentos_fechados" | "orcamentos_abertos" | "tratamentos_executados";
  registros: TransformedOrcamentoFechado[] | TransformedOrcamentoAberto[] | TransformedTratamento[];
  arquivo_nome?: string;
  substituir?: boolean;
}

/** Resposta da API de upload */
export interface UploadResponse {
  upload_batch_id: string;
  total_registros: number;
}

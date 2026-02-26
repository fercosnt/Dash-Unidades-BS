/** Tipos para dashboards admin e parceiro */

export type KpiData = {
  label: string;
  value: number;
  previousValue?: number;
  format: "currency" | "percent" | "number";
};

export type RankingClinica = {
  clinicaId: string;
  clinicaNome: string;
  faturamentoBruto: number;
  valorLiquido: number;
  valorBeautySmile: number;
  valorClinica: number;
  ativo: boolean;
};

export type UploadStatusItem = {
  clinicaId: string;
  clinicaNome: string;
  orcamentosFechados: boolean;
  orcamentosAbertos: boolean;
  tratamentos: boolean;
};

export type KpisAdmin = {
  faturamentoBruto: number;
  totalRecebidoMes: number;
  totalAReceberMes: number;
  totalInadimplente: number;
  valorLiquido: number;
  valorBeautySmile: number;
  resumoCalculado: boolean;
};

export type KpisParceiro = {
  faturamentoBruto: number;
  valorLiquido: number;
  valorClinica: number;
  totalInadimplente: number;
  resumoDisponivel: boolean;
};

export type ChartParceiroPoint = {
  mesReferencia: string;
  faturamentoBruto: number;
  valorClinica: number;
};

/** Ponto do gráfico admin: Faturamento vs Total Recebido por mês */
export type ChartDataAdminPoint = {
  mesReferencia: string;
  faturamentoBruto: number;
  totalRecebidoMes: number;
};

/** Ponto do gráfico admin: Evolução do valor líquido por mês */
export type ChartLiquidoAdminPoint = {
  mesReferencia: string;
  valorLiquido: number;
};

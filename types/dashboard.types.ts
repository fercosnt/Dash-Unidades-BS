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

/** KPIs expandidos V2 — financeiros + operacionais */
export type KpisAdminV2 = {
  faturamentoBruto: number;
  totalRecebidoMes: number;
  totalAReceberMes: number;
  totalInadimplente: number;
  valorLiquido: number;
  valorBeautySmile: number;
  totalImpostoNf: number;
  totalTaxaCartao: number;
  totalCustoMaoObra: number;
  totalCustosProcedimentos: number;
  totalComissoesMedicas: number;
  orcamentosFechadosQtde: number;
  orcamentosFechadosValor: number;
  orcamentosAbertosQtde: number;
  orcamentosAbertosValor: number;
  procedimentosRealizados: number;
  resumoCalculado: boolean;
};

/** Dados para DRE cascata */
export type DreAdminData = {
  faturamentoBruto: number;
  custosProcedimentos: number;
  taxaMaquininha: number;
  impostosNf: number;
  custoMaoObra: number;
  comissoesMedicas: number;
  valorLiquido: number;
  valorBeautySmile: number;
  valorClinica: number;
  percentualBeautySmile: number;
  comissaoDentista: number;
  resultadoLiquidoBS: number;
};

/** Dados para card de repasse (base caixa) */
export type RepasseAdminData = {
  totalRecebido: number;
  taxaSobreRecebido: number;
  impostosNf: number;
  custoMaoObra: number;
  custosProcedimentos: number;
  comissoesMedicas: number;
  disponivelParaSplit: number;
  valorRepassar: number;
  valorBeautySmileRetém: number;
  percentualBeautySmile: number;
};

/** Item da tabela de orçamentos fechados */
export type OrcamentoFechadoItem = {
  id: string;
  pacienteNome: string;
  clinicaNome: string;
  valorTotal: number;
  valorPago: number;
  valorEmAberto: number;
  status: string;
  dataFechamento: string | null;
};

/** Item da tabela de orçamentos abertos */
export type OrcamentoAbertoItem = {
  id: string;
  pacienteNome: string;
  clinicaNome: string;
  valorTotal: number;
  dataCriacao: string | null;
};

/** Item do ranking de procedimentos */
export type ProcedimentoRankingItem = {
  procedimentoNome: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
  percentualQtde: number;
};

/** Ponto do gráfico de evolução de vendas (3 meses) */
export type ChartVendasPoint = {
  mesReferencia: string;
  fechadosQtde: number;
  fechadosValor: number;
  abertosQtde: number;
  abertosValor: number;
};

/** Item da tabela de tratamentos vendidos (agrupado por nome) */
export type TratamentoVendidoItem = {
  tratamentoNome: string;
  quantidade: number;
  valorTotal: number;
  percentualFaturamento: number;
};

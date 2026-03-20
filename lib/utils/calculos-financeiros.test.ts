/**
 * Testes abrangentes das lógicas financeiras puras:
 * - Arredondamento de parcelas (mesmo padrão da RPC registrar_pagamento)
 * - Cálculo do resumo mensal (lógica extraída de resumo-calculo.ts)
 * - Cálculo de comissão dentista (tiers)
 * - Validação de valores da migration 014
 */

// ===== Helpers de cálculo (extraídos dos arquivos de produção) =====

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Simula a lógica de parcelas do RPC registrar_pagamento (005_rpc_pagamentos.sql) */
function calcularParcelas(valor: number, numParcelas: number) {
  const valorParcela = round2(valor / numParcelas);
  const ultimaParcela = round2(valor - valorParcela * (numParcelas - 1));
  const parcelas = [];
  for (let i = 1; i <= numParcelas; i++) {
    parcelas.push({
      parcela_numero: i,
      valor_parcela: i < numParcelas ? valorParcela : ultimaParcela,
    });
  }
  return parcelas;
}

/** Simula a lógica de D+30 para data de recebimento */
function calcularMesRecebimento(dataPagamento: Date, parcelaNumero: number): string {
  const d = new Date(dataPagamento);
  d.setDate(1); // date_trunc('month')
  d.setMonth(d.getMonth() + parcelaNumero);
  return d.toISOString().slice(0, 10);
}

/** Simula o cálculo do resumo mensal (resumo-calculo.ts) */
function calcularResumo(params: {
  faturamentoBruto: number;
  totalCustosProcedimentos: number;
  custoMaoDeObra: number;
  taxaCartaoPct: number;
  impostoNfPct: number;
  totalComissoesMedicas: number;
  percentualBeautySmile: number;
}) {
  const totalTaxaCartao = round2(params.faturamentoBruto * (params.taxaCartaoPct / 100));
  const totalImpostoNf = round2(params.faturamentoBruto * (params.impostoNfPct / 100));
  const valorLiquido = round2(
    params.faturamentoBruto -
      params.totalCustosProcedimentos -
      params.custoMaoDeObra -
      totalTaxaCartao -
      totalImpostoNf -
      params.totalComissoesMedicas
  );
  const pctBs = params.percentualBeautySmile / 100;
  const valorBeautySmile = round2(valorLiquido * pctBs);
  const valorClinica = round2(valorLiquido - valorBeautySmile);
  return {
    faturamentoBruto: round2(params.faturamentoBruto),
    totalCustosProcedimentos: round2(params.totalCustosProcedimentos),
    totalTaxaCartao,
    totalImpostoNf,
    totalComissoesMedicas: round2(params.totalComissoesMedicas),
    valorLiquido,
    valorBeautySmile,
    valorClinica,
  };
}

/** Simula cálculo de comissão por tiers (comissao-dentista-queries.ts) */
function calcularComissaoDentista(
  qtdeVendas: number,
  faturamentoBruto: number,
  config: { tier1Limite: number; tier1Pct: number; tier2Limite: number; tier2Pct: number; tier3Pct: number }
) {
  let tierAplicado = 3;
  let percentual = config.tier3Pct;
  if (qtdeVendas <= config.tier1Limite) {
    tierAplicado = 1;
    percentual = config.tier1Pct;
  } else if (qtdeVendas <= config.tier2Limite) {
    tierAplicado = 2;
    percentual = config.tier2Pct;
  }
  const valorComissao = faturamentoBruto * (percentual / 100);
  return { tierAplicado, percentual, valorComissao };
}

// ===== TESTES: Parcelas e arredondamento =====

describe("Parcelas de cartão — arredondamento", () => {
  it("1 parcela: valor integral", () => {
    const parcelas = calcularParcelas(1000, 1);
    expect(parcelas).toHaveLength(1);
    expect(parcelas[0].valor_parcela).toBe(1000);
  });

  it("2 parcelas divisíveis: valores iguais", () => {
    const parcelas = calcularParcelas(1000, 2);
    expect(parcelas[0].valor_parcela).toBe(500);
    expect(parcelas[1].valor_parcela).toBe(500);
  });

  it("3 parcelas de 100: 33.33 + 33.33 + 33.34", () => {
    const parcelas = calcularParcelas(100, 3);
    expect(parcelas[0].valor_parcela).toBe(33.33);
    expect(parcelas[1].valor_parcela).toBe(33.33);
    expect(parcelas[2].valor_parcela).toBe(33.34);
    const soma = parcelas.reduce((s, p) => s + p.valor_parcela, 0);
    expect(round2(soma)).toBe(100);
  });

  it("7 parcelas de 999.99: soma exata", () => {
    const parcelas = calcularParcelas(999.99, 7);
    expect(parcelas).toHaveLength(7);
    const soma = parcelas.reduce((s, p) => s + p.valor_parcela, 0);
    expect(round2(soma)).toBe(999.99);
  });

  it("12 parcelas (máximo cartão crédito): soma exata", () => {
    const parcelas = calcularParcelas(15000, 12);
    expect(parcelas).toHaveLength(12);
    const soma = parcelas.reduce((s, p) => s + p.valor_parcela, 0);
    expect(round2(soma)).toBe(15000);
    // 15000/12 = 1250, divisão exata
    parcelas.forEach((p) => expect(p.valor_parcela).toBe(1250));
  });

  it("12 parcelas de 10000.01: centavos no último", () => {
    const parcelas = calcularParcelas(10000.01, 12);
    const soma = parcelas.reduce((s, p) => s + p.valor_parcela, 0);
    expect(round2(soma)).toBe(10000.01);
    // Primeiras 11: round(10000.01/12) = 833.33
    for (let i = 0; i < 11; i++) {
      expect(parcelas[i].valor_parcela).toBe(833.33);
    }
    // Última: 10000.01 - 833.33 * 11 = 10000.01 - 9166.63 = 833.38
    expect(parcelas[11].valor_parcela).toBe(833.38);
  });

  it("valor com muitas casas decimais: R$ 1.37 em 3x", () => {
    const parcelas = calcularParcelas(1.37, 3);
    const soma = parcelas.reduce((s, p) => s + p.valor_parcela, 0);
    expect(round2(soma)).toBe(1.37);
  });

  it("valor alto: R$ 35.000,00 em 10x", () => {
    const parcelas = calcularParcelas(35000, 10);
    parcelas.forEach((p) => expect(p.valor_parcela).toBe(3500));
    const soma = parcelas.reduce((s, p) => s + p.valor_parcela, 0);
    expect(round2(soma)).toBe(35000);
  });
});

describe("Parcelas — D+30 (mês de recebimento)", () => {
  it("pagamento em 15/01/2026: parcela 1 recebe em 01/02/2026", () => {
    const data = new Date(2026, 0, 15); // Jan 15
    expect(calcularMesRecebimento(data, 1)).toBe("2026-02-01");
  });

  it("pagamento em 15/01/2026: parcela 3 recebe em 01/04/2026", () => {
    const data = new Date(2026, 0, 15);
    expect(calcularMesRecebimento(data, 3)).toBe("2026-04-01");
  });

  it("pagamento em 31/12/2025: parcela 1 recebe em 01/01/2026 (virada de ano)", () => {
    const data = new Date(2025, 11, 31);
    expect(calcularMesRecebimento(data, 1)).toBe("2026-01-01");
  });

  it("pagamento em 28/02/2026: parcela 12 recebe em 01/02/2027", () => {
    const data = new Date(2026, 1, 28);
    expect(calcularMesRecebimento(data, 12)).toBe("2027-02-01");
  });
});

// ===== TESTES: Cálculo do resumo mensal =====

describe("Cálculo do resumo mensal — split 60/40", () => {
  it("cenário básico: faturamento 100k, custos 20k, mão-de-obra 5k, taxa 5%, imposto 8%", () => {
    const r = calcularResumo({
      faturamentoBruto: 100000,
      totalCustosProcedimentos: 20000,
      custoMaoDeObra: 5000,
      taxaCartaoPct: 5,
      impostoNfPct: 8,
      totalComissoesMedicas: 0,
      percentualBeautySmile: 60,
    });

    expect(r.totalTaxaCartao).toBe(5000);       // 100k * 5%
    expect(r.totalImpostoNf).toBe(8000);         // 100k * 8%
    // Líquido: 100000 - 20000 - 5000 - 5000 - 8000 - 0 = 62000
    expect(r.valorLiquido).toBe(62000);
    expect(r.valorBeautySmile).toBe(37200);      // 62000 * 60%
    expect(r.valorClinica).toBe(24800);           // 62000 * 40%
    // Soma BS + Clínica = Líquido
    expect(r.valorBeautySmile + r.valorClinica).toBe(r.valorLiquido);
  });

  it("faturamento zero: todos os valores ficam zero", () => {
    const r = calcularResumo({
      faturamentoBruto: 0,
      totalCustosProcedimentos: 0,
      custoMaoDeObra: 0,
      taxaCartaoPct: 5,
      impostoNfPct: 8,
      totalComissoesMedicas: 0,
      percentualBeautySmile: 60,
    });

    expect(r.valorLiquido).toBe(0);
    expect(r.valorBeautySmile).toBe(0);
    expect(r.valorClinica).toBe(0);
  });

  it("valor líquido negativo: custos excedem faturamento", () => {
    const r = calcularResumo({
      faturamentoBruto: 10000,
      totalCustosProcedimentos: 15000,
      custoMaoDeObra: 2000,
      taxaCartaoPct: 5,
      impostoNfPct: 8,
      totalComissoesMedicas: 0,
      percentualBeautySmile: 60,
    });

    // Líquido: 10000 - 15000 - 2000 - 500 - 800 = -8300
    expect(r.valorLiquido).toBe(-8300);
    expect(r.valorBeautySmile).toBe(-4980);  // -8300 * 60%
    expect(r.valorClinica).toBe(-3320);       // -8300 - (-4980)
    expect(round2(r.valorBeautySmile + r.valorClinica)).toBe(r.valorLiquido);
  });

  it("com comissão médica: deduz antes do split", () => {
    const r = calcularResumo({
      faturamentoBruto: 50000,
      totalCustosProcedimentos: 5000,
      custoMaoDeObra: 3000,
      taxaCartaoPct: 5,
      impostoNfPct: 8,
      totalComissoesMedicas: 2000,
      percentualBeautySmile: 60,
    });

    // Taxa: 2500, Imposto: 4000
    // Líquido: 50000 - 5000 - 3000 - 2500 - 4000 - 2000 = 33500
    expect(r.valorLiquido).toBe(33500);
    expect(r.valorBeautySmile).toBe(20100); // 33500 * 60%
    expect(r.valorClinica).toBe(13400);      // 33500 * 40%
  });

  it("arredondamento em split 60/40 com centavos", () => {
    // Valor líquido que resulta em centavos no split
    const r = calcularResumo({
      faturamentoBruto: 33333,
      totalCustosProcedimentos: 0,
      custoMaoDeObra: 0,
      taxaCartaoPct: 0,
      impostoNfPct: 0,
      totalComissoesMedicas: 0,
      percentualBeautySmile: 60,
    });

    // 33333 * 0.6 = 19999.8
    expect(r.valorBeautySmile).toBe(19999.8);
    // 33333 - 19999.8 = 13333.2
    expect(r.valorClinica).toBe(13333.2);
    expect(round2(r.valorBeautySmile + r.valorClinica)).toBe(33333);
  });

  it("BS + Clínica sempre somam exatamente o valor líquido", () => {
    // Teste com muitos valores aleatórios fixos
    const cases = [
      { fat: 123456.78, custos: 45000, mdo: 8000, taxa: 4.5, imp: 7.2, com: 1500, pct: 60 },
      { fat: 1.01, custos: 0, mdo: 0, taxa: 5, imp: 8, com: 0, pct: 60 },
      { fat: 99999.99, custos: 10000, mdo: 5000, taxa: 3, imp: 6, com: 3000, pct: 55 },
      { fat: 50000, custos: 0, mdo: 0, taxa: 0, imp: 0, com: 0, pct: 70 },
    ];

    for (const c of cases) {
      const r = calcularResumo({
        faturamentoBruto: c.fat,
        totalCustosProcedimentos: c.custos,
        custoMaoDeObra: c.mdo,
        taxaCartaoPct: c.taxa,
        impostoNfPct: c.imp,
        totalComissoesMedicas: c.com,
        percentualBeautySmile: c.pct,
      });
      // valorClinica = round2(valorLiquido - valorBeautySmile) — garante soma exata
      expect(round2(r.valorBeautySmile + r.valorClinica)).toBe(r.valorLiquido);
    }
  });
});

// ===== TESTES: Comissão dentista (tiers) =====

describe("Comissão dentista — tiers", () => {
  const config = {
    tier1Limite: 10,
    tier1Pct: 3,
    tier2Limite: 20,
    tier2Pct: 5,
    tier3Pct: 7,
  };

  it("0 vendas: tier 1 (≤10)", () => {
    const r = calcularComissaoDentista(0, 50000, config);
    expect(r.tierAplicado).toBe(1);
    expect(r.percentual).toBe(3);
    expect(r.valorComissao).toBe(1500); // 50000 * 3%
  });

  it("10 vendas: tier 1 (exatamente no limite)", () => {
    const r = calcularComissaoDentista(10, 80000, config);
    expect(r.tierAplicado).toBe(1);
    expect(r.percentual).toBe(3);
    expect(r.valorComissao).toBe(2400);
  });

  it("11 vendas: tier 2 (>10, ≤20)", () => {
    const r = calcularComissaoDentista(11, 80000, config);
    expect(r.tierAplicado).toBe(2);
    expect(r.percentual).toBe(5);
    expect(r.valorComissao).toBe(4000);
  });

  it("20 vendas: tier 2 (exatamente no limite)", () => {
    const r = calcularComissaoDentista(20, 100000, config);
    expect(r.tierAplicado).toBe(2);
    expect(r.percentual).toBe(5);
    expect(r.valorComissao).toBe(5000);
  });

  it("21 vendas: tier 3 (>20)", () => {
    const r = calcularComissaoDentista(21, 100000, config);
    expect(r.tierAplicado).toBe(3);
    expect(r.percentual).toBe(7);
    expect(round2(r.valorComissao)).toBe(7000);
  });

  it("100 vendas: tier 3", () => {
    const r = calcularComissaoDentista(100, 200000, config);
    expect(r.tierAplicado).toBe(3);
    expect(r.percentual).toBe(7);
    expect(round2(r.valorComissao)).toBe(14000);
  });

  it("faturamento zero: comissão zero", () => {
    const r = calcularComissaoDentista(50, 0, config);
    expect(r.tierAplicado).toBe(3);
    expect(r.valorComissao).toBe(0);
  });
});

// ===== TESTES: Comissão médico indicador =====

describe("Comissão médico indicador", () => {
  function calcularComissaoMedico(
    orcamentos: { valor_total: number; medico_indicador_id: string | null }[],
    pctByMedico: Record<string, number>
  ) {
    const orcamentosComMedico = orcamentos.filter((o) => o.medico_indicador_id);
    let total = orcamentosComMedico.reduce(
      (s, o) => s + o.valor_total * (pctByMedico[o.medico_indicador_id as string] ?? 0),
      0
    );
    return round2(total);
  }

  it("calcula comissão sobre valor total dos orçamentos com indicação", () => {
    const orcamentos = [
      { valor_total: 10000, medico_indicador_id: "med-1" },
      { valor_total: 20000, medico_indicador_id: "med-1" },
      { valor_total: 5000, medico_indicador_id: null },
    ];
    const pctByMedico = { "med-1": 0.10 }; // 10%

    const total = calcularComissaoMedico(orcamentos, pctByMedico);
    // (10000 + 20000) * 10% = 3000
    expect(total).toBe(3000);
  });

  it("múltiplos médicos com percentuais diferentes", () => {
    const orcamentos = [
      { valor_total: 10000, medico_indicador_id: "med-1" },
      { valor_total: 15000, medico_indicador_id: "med-2" },
    ];
    const pctByMedico = { "med-1": 0.10, "med-2": 0.05 };

    const total = calcularComissaoMedico(orcamentos, pctByMedico);
    // 10000 * 10% + 15000 * 5% = 1000 + 750 = 1750
    expect(total).toBe(1750);
  });

  it("sem orçamentos com indicação: total zero", () => {
    const orcamentos = [
      { valor_total: 50000, medico_indicador_id: null },
    ];
    const total = calcularComissaoMedico(orcamentos, {});
    expect(total).toBe(0);
  });
});

// ===== TESTES: Validação dos valores da migration 014 =====

describe("Migration 014 — valores de procedimentos", () => {
  // Dados da migration 014 para validação
  const PROCEDIMENTOS_014 = [
    { nome: "Alinhador Fotona", custo: 5750, categoria: "Alinhador", valor: 18000 },
    { nome: "Clareamento (4 sessões)", custo: 190, categoria: "Clareamento", valor: 7500 },
    { nome: "Clareamento Dental (Manutenção)", custo: 190, categoria: "Clareamento", valor: 2000 },
    { nome: "Clareamento Dental (Sessão Extra)", custo: 190, categoria: "Clareamento", valor: 1000 },
    { nome: "Clareamento (1 sessão)", custo: 190, categoria: "Clareamento", valor: 2500 },
    { nome: "Consulta", custo: 0, categoria: "Consulta", valor: 0 },
    { nome: "Contenção Alinhador", custo: 1000, categoria: "Alinhador", valor: 3000 },
    { nome: "Desinfecção Periodontal", custo: 300, categoria: "Limpeza a Laser", valor: 10500 },
    { nome: "Limpeza a Laser (Manutenção)", custo: 300, categoria: "Limpeza a Laser", valor: 2000 },
    { nome: "Limpeza a Laser (1 sessão)", custo: 300, categoria: "Limpeza a Laser", valor: 3000 },
    { nome: "Beauty Sleep - Apneia (1 sessão)", custo: 380, categoria: "Beauty Sleep", valor: 4950 },
    { nome: "Beauty Sleep - Apneia (4 Sessões)", custo: 380, categoria: "Beauty Sleep", valor: 15000 },
    { nome: "Beauty Sleep - Apneia (6 Sessões)", custo: 380, categoria: "Beauty Sleep", valor: 17000 },
    { nome: "Beauty Sleep - Apneia (Anual)", custo: 380, categoria: "Beauty Sleep", valor: 35000 },
    { nome: "Beauty Sleep - Apneia (Pacote Extra)", custo: 380, categoria: "Beauty Sleep", valor: 8800 },
    { nome: "Beauty Sleep - Apneia (Sessão Extra)", custo: 380, categoria: "Beauty Sleep", valor: 2750 },
    { nome: "Beauty Sleep - Ronco (1 sessão)", custo: 230, categoria: "Beauty Sleep", valor: 4050 },
    { nome: "Beauty Sleep - Ronco (4 Sessões)", custo: 230, categoria: "Beauty Sleep", valor: 10800 },
    { nome: "Beauty Sleep - Ronco (6 Sessões)", custo: 230, categoria: "Beauty Sleep", valor: 15000 },
    { nome: "Beauty Sleep - Ronco (Anual)", custo: 230, categoria: "Beauty Sleep", valor: 30000 },
    { nome: "Beauty Sleep - Ronco (Pacote Extra)", custo: 230, categoria: "Beauty Sleep", valor: 7200 },
    { nome: "Beauty Sleep - Ronco (Sessão Extra)", custo: 230, categoria: "Beauty Sleep", valor: 2250 },
    { nome: "Sensibilidade (Manutenção)", custo: 190, categoria: "Sensibilidade", valor: 500 },
    { nome: "Sensibilidade (Elemento)", custo: 190, categoria: "Sensibilidade", valor: 1000 },
    { nome: "Sensibilidade (Extra)", custo: 190, categoria: "Sensibilidade", valor: 500 },
  ];

  it("todos os 25 procedimentos estão listados", () => {
    expect(PROCEDIMENTOS_014).toHaveLength(25);
  });

  it("nenhum custo_fixo é negativo", () => {
    PROCEDIMENTOS_014.forEach((p) => {
      expect(p.custo).toBeGreaterThanOrEqual(0);
    });
  });

  it("nenhum valor_tabela é negativo", () => {
    PROCEDIMENTOS_014.forEach((p) => {
      expect(p.valor).toBeGreaterThanOrEqual(0);
    });
  });

  it("custo_fixo nunca excede valor_tabela (exceto Consulta que é 0/0)", () => {
    PROCEDIMENTOS_014.forEach((p) => {
      if (p.valor > 0) {
        expect(p.custo).toBeLessThan(p.valor);
      }
    });
  });

  it("margem (valor - custo) é positiva para todos os tratamentos pagos", () => {
    PROCEDIMENTOS_014.filter((p) => p.valor > 0).forEach((p) => {
      const margem = p.valor - p.custo;
      expect(margem).toBeGreaterThan(0);
    });
  });

  it("Consulta tem custo 0 e valor 0", () => {
    const consulta = PROCEDIMENTOS_014.find((p) => p.nome === "Consulta")!;
    expect(consulta.custo).toBe(0);
    expect(consulta.valor).toBe(0);
  });

  it("categorias são válidas", () => {
    const categoriasValidas = ["Alinhador", "Clareamento", "Consulta", "Limpeza a Laser", "Beauty Sleep", "Sensibilidade"];
    PROCEDIMENTOS_014.forEach((p) => {
      expect(categoriasValidas).toContain(p.categoria);
    });
  });

  it("Beauty Sleep Apneia custa mais que Ronco (custo fixo)", () => {
    const apneia = PROCEDIMENTOS_014.find((p) => p.nome === "Beauty Sleep - Apneia (1 sessão)")!;
    const ronco = PROCEDIMENTOS_014.find((p) => p.nome === "Beauty Sleep - Ronco (1 sessão)")!;
    expect(apneia.custo).toBeGreaterThan(ronco.custo);
  });

  it("Beauty Sleep Apneia (1 sessão) valor tabela > Ronco (1 sessão)", () => {
    const apneia = PROCEDIMENTOS_014.find((p) => p.nome === "Beauty Sleep - Apneia (1 sessão)")!;
    const ronco = PROCEDIMENTOS_014.find((p) => p.nome === "Beauty Sleep - Ronco (1 sessão)")!;
    expect(apneia.valor).toBeGreaterThan(ronco.valor);
  });

  it("Beauty Sleep Apneia Anual é o procedimento mais caro (valor_tabela = 35000)", () => {
    const maisCaros = PROCEDIMENTOS_014.sort((a, b) => b.valor - a.valor);
    expect(maisCaros[0].nome).toBe("Beauty Sleep - Apneia (Anual)");
    expect(maisCaros[0].valor).toBe(35000);
  });

  it("Alinhador Fotona é o procedimento com maior custo fixo (5750)", () => {
    const maiorCusto = PROCEDIMENTOS_014.sort((a, b) => b.custo - a.custo);
    expect(maiorCusto[0].nome).toBe("Alinhador Fotona");
    expect(maiorCusto[0].custo).toBe(5750);
  });

  it("pacotes maiores custam mais (Beauty Sleep Apneia: 1 < 4 < 6 < Anual)", () => {
    const a1 = PROCEDIMENTOS_014.find((p) => p.nome === "Beauty Sleep - Apneia (1 sessão)")!.valor;
    const a4 = PROCEDIMENTOS_014.find((p) => p.nome === "Beauty Sleep - Apneia (4 Sessões)")!.valor;
    const a6 = PROCEDIMENTOS_014.find((p) => p.nome === "Beauty Sleep - Apneia (6 Sessões)")!.valor;
    const aAnual = PROCEDIMENTOS_014.find((p) => p.nome === "Beauty Sleep - Apneia (Anual)")!.valor;
    expect(a1).toBeLessThan(a4);
    expect(a4).toBeLessThan(a6);
    expect(a6).toBeLessThan(aAnual);
  });

  it("pacotes maiores custam mais (Beauty Sleep Ronco: 1 < 4 < 6 < Anual)", () => {
    const r1 = PROCEDIMENTOS_014.find((p) => p.nome === "Beauty Sleep - Ronco (1 sessão)")!.valor;
    const r4 = PROCEDIMENTOS_014.find((p) => p.nome === "Beauty Sleep - Ronco (4 Sessões)")!.valor;
    const r6 = PROCEDIMENTOS_014.find((p) => p.nome === "Beauty Sleep - Ronco (6 Sessões)")!.valor;
    const rAnual = PROCEDIMENTOS_014.find((p) => p.nome === "Beauty Sleep - Ronco (Anual)")!.valor;
    expect(r1).toBeLessThan(r4);
    expect(r4).toBeLessThan(r6);
    expect(r6).toBeLessThan(rAnual);
  });

  it("cálculo do resumo com custos reais da migration 014", () => {
    // Cenário: clínica fez 1 Alinhador + 1 Clareamento 4s + 2 Limpeza 1s
    // Custos: 5750 + 190 + 300*2 = 6540
    // Valor faturado (com desconto): 25000
    const r = calcularResumo({
      faturamentoBruto: 25000,
      totalCustosProcedimentos: 6540,
      custoMaoDeObra: 3000,
      taxaCartaoPct: 5,
      impostoNfPct: 8,
      totalComissoesMedicas: 0,
      percentualBeautySmile: 60,
    });

    // Taxa: 1250, Imposto: 2000
    // Líquido: 25000 - 6540 - 3000 - 1250 - 2000 = 12210
    expect(r.valorLiquido).toBe(12210);
    expect(r.valorBeautySmile).toBe(7326);  // 12210 * 60%
    expect(r.valorClinica).toBe(4884);       // 12210 * 40%
  });
});

// ===== TESTES: round2 =====

describe("round2 — arredondamento a 2 casas", () => {
  it("arredonda para baixo", () => {
    expect(round2(1.234)).toBe(1.23);
  });

  it("arredonda para cima", () => {
    expect(round2(1.235)).toBe(1.24);
  });

  it("mantém 2 casas quando já exato", () => {
    expect(round2(1.23)).toBe(1.23);
  });

  it("funciona com zero", () => {
    expect(round2(0)).toBe(0);
  });

  it("funciona com negativos", () => {
    expect(round2(-1.234)).toBe(-1.23);
    expect(round2(-1.235)).toBe(-1.24);
  });

  it("evita problemas de floating point", () => {
    // 0.1 + 0.2 = 0.30000000000000004
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});

import { splitOrcamento, ProcedimentoRef, OrcamentoParaSplit } from "./split-orcamento";

// Procedimentos de referência baseados na migration 014
const PROCEDIMENTOS: ProcedimentoRef[] = [
  { id: "p1", nome: "Alinhador Fotona", codigo_clinicorp: "Alinhador invisivel Beauty Smile e Fotobiomodulação Laser Fotona", valor_tabela: 18000, categoria: "Alinhador" },
  { id: "p2", nome: "Clareamento (4 sessões)", codigo_clinicorp: "Clareamento dental com Laser Fotona (4 Sessões)", valor_tabela: 7500, categoria: "Clareamento" },
  { id: "p3", nome: "Limpeza a Laser (1 sessão)", codigo_clinicorp: "Limpeza Dental com Laser Fotona (Sessão Única)", valor_tabela: 3000, categoria: "Limpeza a Laser" },
  { id: "p4", nome: "Contenção Alinhador", codigo_clinicorp: "Contenção pós Alinhador e Fotobiomodulação Laser Fotona", valor_tabela: 3000, categoria: "Alinhador" },
  { id: "p5", nome: "Consulta", codigo_clinicorp: "Consulta e avaliação", valor_tabela: 0, categoria: "Consulta" },
  { id: "p6", nome: "Beauty Sleep - Ronco (4 Sessões)", codigo_clinicorp: "Protocolo para diminuição do ronco (4 sessões)", valor_tabela: 10800, categoria: "Beauty Sleep" },
  { id: "p7", nome: "Sensibilidade (Elemento)", codigo_clinicorp: "Sensibilidade dental Protocolo com Laser Fotona (elemento)", valor_tabela: 1000, categoria: "Sensibilidade" },
];

function makeOrc(overrides: Partial<OrcamentoParaSplit> = {}): OrcamentoParaSplit {
  return {
    id: "orc-1",
    clinica_id: "cli-1",
    procedimentos_texto: null,
    valor_total: 10000,
    valor_bruto: null,
    desconto_reais: null,
    ...overrides,
  };
}

describe("splitOrcamento — distribuição proporcional", () => {
  it("distribui valor proporcional entre 2 procedimentos com valores diferentes", () => {
    // Alinhador 18000 + Clareamento 7500 = soma tabela 25500
    // valor_total = 20000
    // Alinhador: 20000 * (18000/25500) = 14117.647... → 14117.65
    // Clareamento: 20000 - 14117.65 = 5882.35
    const orc = makeOrc({
      procedimentos_texto: "Alinhador Fotona + Clareamento (4 sessões)",
      valor_total: 20000,
    });
    const result = splitOrcamento(orc, PROCEDIMENTOS);

    expect(result.items).toHaveLength(2);
    expect(result.soma_valor_tabela).toBe(25500);
    expect(result.valor_total_orcamento).toBe(20000);

    const soma = result.items.reduce((s, it) => s + it.valor_proporcional, 0);
    expect(Math.round(soma * 100) / 100).toBe(20000);

    // Verifica proporcionalidade: Alinhador deve receber ~70.6% do total
    const alinhador = result.items.find((it) => it.procedimento_id === "p1")!;
    expect(alinhador.valor_proporcional).toBeCloseTo(14117.65, 1);

    const clareamento = result.items.find((it) => it.procedimento_id === "p2")!;
    expect(clareamento.valor_proporcional).toBeCloseTo(5882.35, 1);
  });

  it("distribui corretamente entre 3 procedimentos — centavos no último", () => {
    // Limpeza 3000 + Contenção 3000 + Sensibilidade 1000 = 7000
    // valor_total = 5000
    // Limpeza: 5000 * 3000/7000 = 2142.857... → 2142.86
    // Contenção: 5000 * 3000/7000 = 2142.857... → 2142.86
    // Sensibilidade (último): 5000 - 2142.86 - 2142.86 = 714.28
    const orc = makeOrc({
      procedimentos_texto: "Limpeza a Laser (1 sessão) + Contenção Alinhador + Sensibilidade (Elemento)",
      valor_total: 5000,
    });
    const result = splitOrcamento(orc, PROCEDIMENTOS);

    expect(result.items).toHaveLength(3);
    const soma = result.items.reduce((s, it) => s + it.valor_proporcional, 0);
    expect(Math.round(soma * 100) / 100).toBe(5000);
  });

  it("soma proporcional sempre iguala valor_total — caso indivisível", () => {
    // 3 itens iguais (Limpeza 3000 + Contenção 3000 + Sensibilidade 1000)
    // valor_total = 10000.01
    const orc = makeOrc({
      procedimentos_texto: "Limpeza a Laser (1 sessão) + Contenção Alinhador + Sensibilidade (Elemento)",
      valor_total: 10000.01,
    });
    const result = splitOrcamento(orc, PROCEDIMENTOS);
    const soma = result.items.reduce((s, it) => s + it.valor_proporcional, 0);
    expect(Math.round(soma * 100) / 100).toBe(10000.01);
  });

  it("tratamento único recebe 100% do valor", () => {
    const orc = makeOrc({
      procedimentos_texto: "Alinhador Fotona",
      valor_total: 15000,
    });
    const result = splitOrcamento(orc, PROCEDIMENTOS);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].valor_proporcional).toBe(15000);
    expect(result.items[0].procedimento_id).toBe("p1");
    expect(result.items[0].match_status).toBe("auto");
  });

  it("itens sem match (unmatched) recebem distribuição igual", () => {
    const orc = makeOrc({
      procedimentos_texto: "Tratamento X + Tratamento Y + Tratamento Z",
      valor_total: 9000,
    });
    const result = splitOrcamento(orc, PROCEDIMENTOS);

    expect(result.items).toHaveLength(3);
    result.items.forEach((it) => {
      expect(it.match_status).toBe("unmatched");
      expect(it.procedimento_id).toBeNull();
      expect(it.valor_tabela).toBe(0);
    });

    const soma = result.items.reduce((s, it) => s + it.valor_proporcional, 0);
    expect(Math.round(soma * 100) / 100).toBe(9000);
    // Cada item: 3000
    expect(result.items[0].valor_proporcional).toBe(3000);
    expect(result.items[1].valor_proporcional).toBe(3000);
    expect(result.items[2].valor_proporcional).toBe(3000);
  });

  it("distribuição igual com centavos — valor indivisível por 3", () => {
    const orc = makeOrc({
      procedimentos_texto: "X + Y + Z",
      valor_total: 100,
    });
    const result = splitOrcamento(orc, PROCEDIMENTOS);

    // 100 / 3 = 33.33 para os 2 primeiros, último = 100 - 66.66 = 33.34
    expect(result.items).toHaveLength(3);
    const soma = result.items.reduce((s, it) => s + it.valor_proporcional, 0);
    expect(Math.round(soma * 100) / 100).toBe(100);
    expect(result.items[0].valor_proporcional).toBe(33.33);
    expect(result.items[1].valor_proporcional).toBe(33.33);
    expect(result.items[2].valor_proporcional).toBe(33.34);
  });
});

describe("splitOrcamento — edge cases", () => {
  it("procedimentos_texto null retorna item único com valor total", () => {
    const orc = makeOrc({ procedimentos_texto: null, valor_total: 5000 });
    const result = splitOrcamento(orc, PROCEDIMENTOS);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].valor_proporcional).toBe(5000);
    expect(result.items[0].match_status).toBe("unmatched");
  });

  it("procedimentos_texto vazio retorna item único", () => {
    const orc = makeOrc({ procedimentos_texto: "", valor_total: 5000 });
    const result = splitOrcamento(orc, PROCEDIMENTOS);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].valor_proporcional).toBe(5000);
  });

  it("calcula divergência corretamente entre soma tabela e valor bruto", () => {
    const orc = makeOrc({
      procedimentos_texto: "Alinhador Fotona + Clareamento (4 sessões)",
      valor_total: 20000,
      valor_bruto: 25000,
    });
    const result = splitOrcamento(orc, PROCEDIMENTOS);

    // soma_tabela = 25500, valor_bruto = 25000
    // divergência = 25500 - 25000 = 500
    expect(result.divergencia).toBe(500);
    expect(result.divergencia_percentual).toBe(2); // 500/25000 * 100 = 2%
  });

  it("calcula desconto aplicado a partir de desconto_reais quando informado", () => {
    const orc = makeOrc({
      procedimentos_texto: "Alinhador Fotona",
      valor_total: 15000,
      desconto_reais: 3000,
    });
    const result = splitOrcamento(orc, PROCEDIMENTOS);
    expect(result.desconto_aplicado).toBe(3000);
  });

  it("calcula desconto implícito quando desconto_reais não informado", () => {
    const orc = makeOrc({
      procedimentos_texto: "Alinhador Fotona",
      valor_total: 15000,
      desconto_reais: null,
    });
    const result = splitOrcamento(orc, PROCEDIMENTOS);
    // desconto = soma_tabela - valor_total = 18000 - 15000 = 3000
    expect(result.desconto_aplicado).toBe(3000);
  });

  it("separação por vírgula funciona igual ao +", () => {
    const orc = makeOrc({
      procedimentos_texto: "Alinhador Fotona, Clareamento (4 sessões)",
      valor_total: 20000,
    });
    const result = splitOrcamento(orc, PROCEDIMENTOS);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].procedimento_id).toBe("p1");
    expect(result.items[1].procedimento_id).toBe("p2");
  });

  it("mix de matched e unmatched distribui corretamente", () => {
    // Alinhador (18000) + Unknown (0) — soma = 18000
    // valor_total = 10000
    // Alinhador: 10000 * (18000/18000) = 10000
    // Unknown (último): 10000 - 10000 = 0
    const orc = makeOrc({
      procedimentos_texto: "Alinhador Fotona + Tratamento Desconhecido",
      valor_total: 10000,
    });
    const result = splitOrcamento(orc, PROCEDIMENTOS);

    expect(result.items).toHaveLength(2);
    expect(result.items[0].procedimento_id).toBe("p1");
    expect(result.items[0].match_status).toBe("auto");
    expect(result.items[1].procedimento_id).toBeNull();
    expect(result.items[1].match_status).toBe("unmatched");

    const soma = result.items.reduce((s, it) => s + it.valor_proporcional, 0);
    expect(Math.round(soma * 100) / 100).toBe(10000);
  });

  it("valor_total = 0 distribui zero para todos", () => {
    const orc = makeOrc({
      procedimentos_texto: "Consulta",
      valor_total: 0,
    });
    const result = splitOrcamento(orc, PROCEDIMENTOS);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].valor_proporcional).toBe(0);
    expect(result.items[0].procedimento_id).toBe("p5");
  });
});

describe("splitOrcamento — categorias e metadata", () => {
  it("preserva categoria de cada procedimento matched", () => {
    const orc = makeOrc({
      procedimentos_texto: "Alinhador Fotona + Beauty Sleep - Ronco (4 Sessões)",
      valor_total: 25000,
    });
    const result = splitOrcamento(orc, PROCEDIMENTOS);

    expect(result.items[0].categoria).toBe("Alinhador");
    expect(result.items[1].categoria).toBe("Beauty Sleep");
  });

  it("unmatched tem categoria null", () => {
    const orc = makeOrc({
      procedimentos_texto: "Algo Inexistente",
      valor_total: 1000,
    });
    const result = splitOrcamento(orc, PROCEDIMENTOS);
    expect(result.items[0].categoria).toBeNull();
  });
});

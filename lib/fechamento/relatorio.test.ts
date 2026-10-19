import type { SupabaseClient } from "@supabase/supabase-js";
import { agruparProcedimentos, mesAnterior, montarRelatorio, schemaRelatorioParceiro, type RelatorioInterno } from "./relatorio";

type Linha = Record<string, unknown>;

/**
 * Supabase falso: aplica eq/gte/lte/in/is sobre as linhas da tabela e IGNORA o select —
 * devolve a linha inteira, inclusive colunas internas. Assim o teste prova que a whitelist
 * do relatório do parceiro é que barra o vazamento, não o select.
 */
function fakeDb(tabelas: Record<string, Linha[]>, rpcs: Record<string, Linha[]> = {}) {
  const tabelasLidas: string[] = [];
  const rpcsChamadas: string[] = [];
  const from = (tabela: string) => {
    tabelasLidas.push(tabela);
    let rows = [...(tabelas[tabela] ?? [])];
    const b = {
      select: () => b,
      order: () => b,
      eq: (c: string, v: unknown) => ((rows = rows.filter((r) => r[c] === v)), b),
      gte: (c: string, v: unknown) => ((rows = rows.filter((r) => String(r[c]) >= String(v))), b),
      lte: (c: string, v: unknown) => ((rows = rows.filter((r) => String(r[c]) <= String(v))), b),
      in: (c: string, vs: unknown[]) => ((rows = rows.filter((r) => vs.includes(r[c]))), b),
      is: (c: string, v: unknown) => ((rows = rows.filter((r) => (r[c] ?? null) === v)), b),
      limit: (n: number) => ((rows = rows.slice(0, n)), b),
      single: async () =>
        rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { code: "PGRST116", message: "0 rows" } },
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (ok: (v: unknown) => unknown, erro?: (e: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(ok, erro),
    };
    return b;
  };
  const rpc = async (nome: string) => {
    rpcsChamadas.push(nome);
    return { data: rpcs[nome] ?? [], error: null };
  };
  return { db: { from, rpc } as unknown as SupabaseClient, tabelasLidas, rpcsChamadas };
}

const C = "11111111-1111-4111-8111-111111111111";
const SET = "2026-09-01";

// Sentinelas internas: nenhuma pode aparecer no relatório do parceiro.
const SEGREDOS = [
  "SALARIO_DRA_SECRETA",
  "4321.99", // salário dentista
  "555.55", // insumos
  "777.77", // comissão dentista
  "133.2", // taxa real de cartão
  "DECISAO_SECRETA",
  "DIVERGENCIA_SECRETA",
  "user-interno-123",
  "TOKEN_SECRETO",
  "REGRA_SECRETA",
  "rep-1", // refId do extrato
  "deb-1", // id da dívida
];

const resumoSet = {
  clinica_id: C,
  mes_referencia: SET,
  faturamento_bruto: 15000,
  total_custos_procedimentos: 1980,
  total_custo_mao_obra: 6000,
  total_taxa_cartao: 450,
  total_imposto_nf: 900,
  total_comissoes_medicas: 0,
  valor_liquido: 5670,
  valor_beauty_smile: 3402,
  valor_clinica: 2268,
  total_recebido_mes: 9000,
  total_recebimentos_futuros: 0,
};

function base(over: Partial<Record<string, Linha[]>> = {}): Record<string, Linha[]> {
  return {
    clinicas_parceiras: [{ id: C, nome: "Hirata Odontologia", custo_mao_de_obra: 6000, clinicorp_token: "TOKEN_SECRETO" }],
    fechamentos: [
      {
        id: "f-1",
        clinica_id: C,
        mes_referencia: SET,
        status: "fechado",
        fechado_em: "2026-10-05T12:00:00Z",
        fechado_por: "user-interno-123",
        decisoes: [{ passo: "despesas", texto: "DECISAO_SECRETA: salário lançado cheio" }],
        divergencias: [{ fonte: "rede", descricao: "DIVERGENCIA_SECRETA", valor: 12.34 }],
        snapshot: { despesas: [{ descricao: "SALARIO_DRA_SECRETA" }] },
      },
    ],
    orcamentos_fechados: [
      { clinica_id: C, mes_referencia: SET, paciente_nome: "Maria Souza", data_fechamento: "2026-09-03", valor_total: 10000, valor_pago: 4000, valor_em_aberto: 6000, status: "parcial" },
      { clinica_id: C, mes_referencia: SET, paciente_nome: "João Lima", data_fechamento: "2026-09-10", valor_total: 5000, valor_pago: 5000, valor_em_aberto: 0, status: "quitado" },
      { clinica_id: C, mes_referencia: SET, paciente_nome: "Ana Cortesia", data_fechamento: "2026-09-12", valor_total: 0, valor_pago: 0, valor_em_aberto: 0, status: "quitado" },
      { clinica_id: C, mes_referencia: "2026-08-01", paciente_nome: "Pedro Alves", data_fechamento: "2026-08-20", valor_total: 3000, valor_pago: 1000, valor_em_aberto: 2000, status: "parcial" },
    ],
    tratamentos_executados: [
      { clinica_id: C, mes_referencia: SET, quantidade: 1, procedimento_id: "p1", procedimentos: { nome: "Clareamento", custo_fixo: 190 } },
      { clinica_id: C, mes_referencia: SET, quantidade: 1, procedimento_id: "p1", procedimentos: { nome: "Clareamento", custo_fixo: 190 } },
      { clinica_id: C, mes_referencia: SET, quantidade: 2, procedimento_id: "p2", procedimentos: { nome: "Lentes", custo_fixo: 800 } },
      { clinica_id: C, mes_referencia: SET, quantidade: 1, procedimento_id: null, procedimentos: null },
    ],
    resumo_mensal: [
      resumoSet,
      { ...resumoSet, mes_referencia: "2026-08-01", faturamento_bruto: 3000, valor_liquido: -4200, valor_beauty_smile: -2520, valor_clinica: -1680 },
    ],
    configuracoes_financeiras: [{ percentual_beauty_smile: 60, vigencia_fim: null }],
    repasses_mensais: [{ id: "rep-1", clinica_id: C, mes_referencia: SET, valor_repasse: 1000 }],
    debito_parceiro: [
      { id: "deb-1", clinica_id: C, status: "ativo", descricao: "Taxa de Implementação", valor_total: 250000, valor_pago: 10000, data_inicio: "2026-01-15" },
    ],
    abatimentos_debito: [{ debito_id: "deb-1", repasse_id: null, mes_referencia: SET, valor_abatido: 10000 }],
    despesas_operacionais: [
      { id: "d1", clinica_id: C, mes_referencia: SET, categoria_id: "cat-sal", descricao: "SALARIO_DRA_SECRETA", valor: 4321.99, recorrente: true, categorias_despesa: { nome: "Salário Dentista" }, clinicas_parceiras: { nome: "Hirata" } },
      { id: "d2", clinica_id: C, mes_referencia: SET, categoria_id: "cat-ins", descricao: null, valor: 555.55, recorrente: true, categorias_despesa: { nome: "Insumos para Atendimento" }, clinicas_parceiras: { nome: "Hirata" } },
    ],
    comissoes_dentista: [
      { clinica_id: C, mes_referencia: SET, dentista_id: "den-1", qtde_vendas: 2, base_calculo: 15000, valor_comissao: 777.77, status: "pendente" },
    ],
    pagamentos: [
      { id: "pg1", clinica_id: C, data_pagamento: "2026-09-03", valor: 4000, forma: "cartao_credito", parcelas: 1, bandeira: null },
      { id: "pg2", clinica_id: C, data_pagamento: "2026-09-10", valor: 5000, forma: "pix", parcelas: 1, bandeira: null },
    ],
    parcelas_cartao: [],
    taxas_cartao_reais: [{ id: "t1", vigencia_fim: null, bandeira: "visa_master", modalidade: "credito", numero_parcelas: 1, taxa_percentual: 3.33 }],
    regras_procedimento: [{ id: "r1", padrao: "REGRA_SECRETA", ativo: true }],
    ...over,
  };
}

const rpcs = {
  calcular_resultado_mensal_parceiro: [
    { mes: "2026-08-01", resultado: -1680 },
    { mes: SET, resultado: 1200 },
  ],
};

const agora = () => new Date("2026-10-19T12:00:00Z");

function chavesRecursivas(v: unknown, acc: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x) => chavesRecursivas(x, acc));
  else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      acc.push(k);
      chavesRecursivas(x, acc);
    }
  }
  return acc;
}

const CHAVE_INTERNA =
  /despesa|dentista|salario|taxa_?real|resultado_?unidade|receita|margem|decis|diverg|regra|fechado_por|interno|ref_?id|snapshot|pendenc|alerta|token|dre/i;

describe("montarRelatorio — tipo parceiro (whitelist)", () => {
  it("não contém nenhuma chave nem valor interno, mesmo com o banco devolvendo colunas internas", async () => {
    const { db, tabelasLidas } = fakeDb(base(), rpcs);
    const rel = await montarRelatorio(db, C, "2026-09", "parceiro", { agora });
    const json = JSON.stringify(rel);

    for (const s of SEGREDOS) expect(json).not.toContain(s);
    expect(chavesRecursivas(rel).filter((k) => CHAVE_INTERNA.test(k))).toEqual([]);
    expect(Object.keys(rel).sort()).toEqual(
      [
        "calculo",
        "clinica",
        "comparativo_mes_anterior",
        "conta_corrente",
        "fechamento",
        "gerado_em",
        "inadimplencia",
        "mes",
        "recebimentos",
        "tipo",
        "vendas",
      ].sort()
    );

    // Nem consulta as tabelas internas.
    for (const t of ["despesas_operacionais", "comissoes_dentista", "taxas_cartao_reais", "regras_procedimento", "sync_logs", "profiles", "dentistas"]) {
      expect(tabelasLidas).not.toContain(t);
    }
  });

  it("traz vendas, cálculo do split, inadimplência, conta corrente e comparativo", async () => {
    const { db } = fakeDb(base(), rpcs);
    const rel = await montarRelatorio(db, C, "2026-09", "parceiro", { agora });

    expect(rel).toMatchObject({
      tipo: "parceiro",
      clinica: { id: C, nome: "Hirata Odontologia" },
      mes: "2026-09",
      fechamento: { fechado: true, fechado_em: "2026-10-05T12:00:00Z" },
      vendas: { quantidade: 2, cortesias: 1 },
      calculo: {
        resumo_calculado: true,
        faturamento_bruto: 15000,
        custos: { mao_de_obra: 6000, taxa_cartao: 450, imposto_nf: 900, comissoes_medicas: 0, total: 9330 },
        valor_liquido: 5670,
        percentual_beauty_smile: 60,
        percentual_parceiro: 40,
        parte_beauty_smile: 3402,
        parte_parceiro: 2268,
      },
      recebimentos: { recebido_no_mes: 9000 },
      inadimplencia: { posicao_em: "2026-10-19", em_aberto_vendas_do_mes: 6000, total_em_aberto: 8000 },
      conta_corrente: {
        saldo_atual: -241480,
        saldo_fim_do_mes: -241480,
        resultado_do_mes: 1200,
        repasses_do_mes: 1000,
        pagamentos_implementacao_do_mes: 10000,
        taxa_implementacao: { valor_total: 250000, a_amortizar: 240000 },
        operacional_acumulado: 8520,
        competencia_acumulada: 588,
      },
      comparativo_mes_anterior: { mes: "2026-08", faturamento_bruto: 3000, valor_liquido: -4200, parte_parceiro: -1680 },
    });
    expect(rel.vendas.lista.map((v) => v.paciente)).toEqual(["Maria Souza", "João Lima"]);
    expect(rel.calculo.custos.procedimentos.itens).toEqual([
      { procedimento: "Lentes", quantidade: 2, custo_unitario: 800, total: 1600 },
      { procedimento: "Clareamento", quantidade: 2, custo_unitario: 190, total: 380 },
    ]);
    expect(rel.inadimplencia.devedores.map((d) => [d.paciente, d.valor_em_aberto])).toEqual([
      ["Maria Souza", 6000],
      ["Pedro Alves", 2000],
    ]);
  });

  it("a whitelist descarta chaves não declaradas em qualquer nível", async () => {
    const { db } = fakeDb(base(), rpcs);
    const rel = await montarRelatorio(db, C, "2026-09", "parceiro", { agora });
    const sujo = {
      ...rel,
      despesas: [{ categoria: "Salário Dentista", total: 4321.99 }],
      calculo: { ...rel.calculo, resultadoUnidade: 1, custos: { ...rel.calculo.custos, taxaRealCartao: 133.2 } },
      conta_corrente: { ...rel.conta_corrente, extrato: rel.conta_corrente.extrato.map((l) => ({ ...l, refId: "rep-1" })) },
    };
    const limpo = schemaRelatorioParceiro.parse(sujo);
    expect(limpo).toEqual(rel);
    for (const s of ["4321.99", "133.2", "rep-1", "resultadoUnidade", "despesas"]) expect(JSON.stringify(limpo)).not.toContain(s);
  });

  it("usa o client do usuário na RPC da conta corrente e falha se ela voltar vazia (guard)", async () => {
    const admin = fakeDb(base());
    const usuario = fakeDb({}, rpcs);
    await montarRelatorio(admin.db, C, "2026-09", "parceiro", { agora, rpc: usuario.db });
    expect(admin.rpcsChamadas).toEqual([]);
    expect(usuario.rpcsChamadas).toEqual(["calcular_resultado_mensal_parceiro"]);

    await expect(montarRelatorio(fakeDb(base()).db, C, "2026-09", "parceiro", { agora })).rejects.toThrow(/Conta corrente indisponível/);
  });

  it("clínica inexistente → erro 404", async () => {
    const { db } = fakeDb(base({ clinicas_parceiras: [] }), rpcs);
    await expect(montarRelatorio(db, C, "2026-09", "parceiro", { agora })).rejects.toMatchObject({ status: 404 });
  });
});

describe("montarRelatorio — tipo interno", () => {
  it("inclui tudo do parceiro + DREs, margem do dentista, decisões e alertas", async () => {
    const { db } = fakeDb(base(), rpcs);
    const parceiro = await montarRelatorio(db, C, "2026-09", "parceiro", { agora });
    const rel = (await montarRelatorio(fakeDb(base(), rpcs).db, C, "2026-09", "interno", { agora })) as RelatorioInterno;

    const { interno, tipo, ...resto } = rel;
    expect(tipo).toBe("interno");
    expect(resto).toEqual((({ tipo: _t, ...r }) => r)(parceiro));

    expect(interno.dre_faturamento.receitaBsBruta).toBeCloseTo(12732, 2);
    expect(interno.dre_faturamento.taxaRealCartao).toBeCloseTo(133.2, 2);
    expect(interno.dre_faturamento.despesasPorCategoria.map((d) => d.categoria)).toEqual([
      "Salário Dentista",
      "Insumos para Atendimento",
      "Comissão Dentista",
    ]);
    expect(interno.dre_faturamento.totalDespesas).toBeCloseTo(5655.31, 2);
    expect(interno.dre_faturamento.resultadoUnidade).toBeCloseTo(6943.49, 2);
    expect(interno.dre_recebiveis.totalRecebido).toBe(9000);
    expect(interno.margem_dentista).toEqual({ mao_de_obra_cobrada: 6000, salario_dentista: 4321.99, comissao_dentista: 777.77, margem: 900.24 });
    expect(interno.fechamento.decisoes[0]?.texto).toMatch(/DECISAO_SECRETA/);
    expect(interno.fechamento.divergencias).toHaveLength(1);
    expect(interno.pendencias).toEqual([]);
    expect(interno.alertas.join(" ")).toMatch(/Inadimplência alta: 40%/);
    expect(interno.alertas.join(" ")).toMatch(/1 divergência/);

    // Controle do teste de vazamento: as sentinelas chegam ao relatório interno.
    const json = JSON.stringify(rel);
    for (const s of ["4321.99", "555.55", "777.77", "133.2", "DECISAO_SECRETA", "DIVERGENCIA_SECRETA", "user-interno-123"]) {
      expect(json).toContain(s);
    }
  });

  it("mês aberto com líquido negativo → alerta e pendências do checklist", async () => {
    const negativo = { ...resumoSet, valor_liquido: -1500, valor_beauty_smile: -900, valor_clinica: -600 };
    const { db } = fakeDb(
      base({ fechamentos: [], resumo_mensal: [negativo], despesas_operacionais: [], comissoes_dentista: [] }),
      rpcs
    );
    const rel = (await montarRelatorio(db, C, "2026-09", "interno", { agora })) as RelatorioInterno;
    expect(rel.fechamento).toEqual({ fechado: false, fechado_em: null });
    expect(rel.interno.alertas.join(" ")).toMatch(/Valor líquido negativo/);
    expect(rel.interno.pendencias.length).toBeGreaterThan(0);
    expect(rel.interno.pendencias.every((p) => p.nivel !== "ok")).toBe(true);
  });
});

describe("helpers", () => {
  it("mesAnterior vira o ano", () => {
    expect(mesAnterior("2026-01")).toBe("2025-12");
    expect(mesAnterior("2026-10")).toBe("2026-09");
  });

  it("agruparProcedimentos ignora linha sem procedimento", () => {
    expect(agruparProcedimentos([{ quantidade: 1, procedimento_id: null, procedimentos: null }])).toEqual([]);
  });
});

import { executarFerramenta, FERRAMENTAS, type Ambiente, type DepsFerramentas } from "./ferramentas";
import { montarProcedimentosFinais, prepararLinhasDoMes, resolverClinica, resolverPorNome } from "./resolver";
import type { ResultadoMapeamento } from "@/lib/fechamento/mapear-procedimentos";

const CLINICA_ID = "11111111-1111-4111-8111-111111111111";
const ORCAMENTO_ID = "22222222-2222-4222-8222-222222222222";

const catalogo = {
  clinicas: [
    { id: CLINICA_ID, nome: "Hirata Odontologia", clinicorp_subscriber_id: "hirata" },
    { id: "33333333-3333-4333-8333-333333333333", nome: "Clínica Sorriso", clinicorp_subscriber_id: null },
  ],
  procedimentos: [
    { id: "p-clar", nome: "Clareamento (4 sessões)", custo_fixo: 190, categoria: null },
    { id: "p-cons", nome: "Consulta", custo_fixo: 0, categoria: null },
  ],
  regras: [],
  medicos: [{ id: "m-1", nome: "Dra. Ana Lima", clinica_id: CLINICA_ID, percentual_comissao: 10 }],
  categorias_despesa: [
    { id: "c-sal", nome: "Salário Dentista" },
    { id: "c-ins", nome: "Insumos para Atendimento" },
  ],
  dentistas: [],
};

const mapeamento: ResultadoMapeamento = {
  mapeadas: [
    {
      data: "2026-09-03",
      paciente: "Maria Souza",
      texto_original: "Clareamento + Avaliação",
      parte: "Clareamento",
      procedimento_id: "p-clar",
      procedimento_nome: "Clareamento (4 sessões)",
      custo: 190,
      regra_id: "r1",
      valor: 500,
      profissional: "Dra. X",
    },
  ],
  ignoradas: [],
  ambiguas: [{ data: "2026-09-03", paciente: "Maria Souza", texto_original: "Clareamento + Avaliação", parte: "Avaliação" }],
  possiveisDuplicatas: [],
  custoTotal: 190,
};

function criarAmbiente() {
  const deps = {
    catalogoFechamento: jest.fn().mockResolvedValue(catalogo),
    statusFechamento: jest.fn().mockResolvedValue({ clinicaId: CLINICA_ID, mes: "2026-09", fechado: false, fechamento: null, checklist: [{ passo: "sync", nivel: "ok", resumo: "ok" }] }),
    mapearProcedimentosMes: jest.fn().mockResolvedValue(mapeamento),
    gravarProcedimentosMes: jest.fn().mockResolvedValue({ inseridas: 2 }),
    criarRegraProcedimento: jest.fn().mockResolvedValue({ id: "nova" }),
    sincronizarMes: jest.fn().mockResolvedValue({ ok: true }),
    definirIndicacao: jest.fn().mockResolvedValue({ ok: true }),
    lancarDespesa: jest.fn().mockResolvedValue({ id: "d-1" }),
    recalcularComissaoDentista: jest.fn().mockResolvedValue({ resultados: [] }),
    recalcularResumo: jest.fn().mockResolvedValue({ ok: true }),
    fecharMes: jest.fn().mockResolvedValue({ ok: true, fechamentoId: "f-1" }),
    reabrirMes: jest.fn().mockResolvedValue({ ok: true, fechamentoId: "f-1" }),
    relatorioMensal: jest.fn().mockImplementation(async (_ctx, input: { tipo: string; mes: string }) => ({ tipo: input.tipo, mes: input.mes })),
  };
  const amb: Ambiente = {
    ctx: { admin: {} as Ambiente["ctx"]["admin"], userId: "user-1" },
    email: "admin@bs.com",
    deps: deps as unknown as DepsFerramentas,
  };
  return { amb, deps };
}

describe("FERRAMENTAS", () => {
  it("expõe as 13 tools da 0.1.0 menos bs_ler_planilha, mais bs_relatorio", () => {
    expect(FERRAMENTAS.map((f) => f.nome).sort()).toEqual(
      [
        "bs_catalogo",
        "bs_comissao_dentista",
        "bs_conexao",
        "bs_criar_regra",
        "bs_fechar",
        "bs_gravar_procedimentos",
        "bs_indicacao",
        "bs_lancar_despesa",
        "bs_mapear_procedimentos",
        "bs_recalcular",
        "bs_reabrir",
        "bs_relatorio",
        "bs_status",
        "bs_sync",
      ].sort()
    );
  });
});

describe("tools → ações", () => {
  it("bs_conexao devolve o usuário do token e as clínicas", async () => {
    const { amb } = criarAmbiente();
    await expect(executarFerramenta("bs_conexao", {}, amb)).resolves.toMatchObject({
      conectado: true,
      usuario: "admin@bs.com",
      clinicas: ["Hirata Odontologia", "Clínica Sorriso"],
    });
  });

  it("bs_status resolve a clínica pelo subscriber_id", async () => {
    const { amb, deps } = criarAmbiente();
    const r = await executarFerramenta("bs_status", { clinica: "hirata", mes: "2026-09" }, amb);
    expect(deps.statusFechamento).toHaveBeenCalledWith(amb.ctx, { clinica_id: CLINICA_ID, mes: "2026-09" });
    expect(r).toMatchObject({ clinica: "Hirata Odontologia" });
  });

  it("bs_lancar_despesa: sem confirmar só mostra prévia; com confirmar grava com ids resolvidos", async () => {
    const { amb, deps } = criarAmbiente();
    const input = { clinica: "Hirata", mes: "2026-09", categoria: "salario dentista", valor: 4500 };

    const previa = await executarFerramenta("bs_lancar_despesa", input, amb);
    expect(previa).toMatchObject({ gravado: false, previa: { categoria: "Salário Dentista", recorrente: true } });
    expect(deps.lancarDespesa).not.toHaveBeenCalled();

    await executarFerramenta("bs_lancar_despesa", { ...input, confirmar: true }, amb);
    expect(deps.lancarDespesa).toHaveBeenCalledWith(amb.ctx, {
      clinica_id: CLINICA_ID,
      mes: "2026-09",
      categoria: "Salário Dentista",
      valor: 4500,
      descricao: undefined,
      recorrente: true,
    });
  });

  it("bs_mapear_procedimentos normaliza as linhas e recusa linha fora do mês", async () => {
    const { amb, deps } = criarAmbiente();
    await executarFerramenta(
      "bs_mapear_procedimentos",
      { clinica: "Hirata", mes: "2026-09", linhas: [{ data: "03/09/2026", paciente: "Maria Souza (56)", procedimento: "Clareamento + Avaliação" }] },
      amb
    );
    expect(deps.mapearProcedimentosMes).toHaveBeenCalledWith(amb.ctx, {
      clinica_id: CLINICA_ID,
      mes: "2026-09",
      linhas: [{ data: "2026-09-03", paciente: "Maria Souza", procedimento: "Clareamento + Avaliação" }],
    });

    await expect(
      executarFerramenta(
        "bs_mapear_procedimentos",
        { clinica: "Hirata", mes: "2026-09", linhas: [{ data: "2026-08-31", paciente: "X", procedimento: "Consulta" }] },
        amb
      )
    ).rejects.toThrow(/fora de 2026-09/);
  });

  it("bs_gravar_procedimentos exige resolver ambíguas e grava sem campos de prévia", async () => {
    const { amb, deps } = criarAmbiente();
    const base = {
      clinica: "Hirata",
      mes: "2026-09",
      linhas: [{ data: "2026-09-03", paciente: "Maria Souza", procedimento: "Clareamento + Avaliação", valor: 500, profissional: "Dra. X" }],
    };

    await expect(executarFerramenta("bs_gravar_procedimentos", base, amb)).rejects.toThrow(/Faltam resolver 1/);

    const r = await executarFerramenta(
      "bs_gravar_procedimentos",
      { ...base, resolucoes: [{ data: "2026-09-03", paciente: "Maria Souza", parte: "Avaliação", procedimento: "Consulta" }], confirmar: true },
      amb
    );
    expect(r).toMatchObject({ gravado: true, inseridas: 2, linhas_a_gravar: 2 });
    expect(deps.gravarProcedimentosMes).toHaveBeenCalledWith(amb.ctx, {
      clinica_id: CLINICA_ID,
      mes: "2026-09",
      linhas: [
        { data: "2026-09-03", paciente: "Maria Souza", procedimento_id: "p-clar", texto_original: "Clareamento + Avaliação", profissional: "Dra. X", valor: 500 },
        { data: "2026-09-03", paciente: "Maria Souza", procedimento_id: "p-cons", texto_original: "Clareamento + Avaliação", profissional: "Dra. X", valor: 500 },
      ],
    });
  });

  it("bs_criar_regra com procedimento null vira regra de ignorar", async () => {
    const { amb, deps } = criarAmbiente();
    await executarFerramenta("bs_criar_regra", { padrao: "avaliacao", procedimento: null, confirmar: true }, amb);
    expect(deps.criarRegraProcedimento).toHaveBeenCalledWith(amb.ctx, {
      padrao: "avaliacao",
      procedimento_id: null,
      ignorar: true,
      prioridade: 25,
      clinica_id: null,
      observacao: undefined,
    });
  });

  it("bs_indicacao resolve o médico por nome parcial", async () => {
    const { amb, deps } = criarAmbiente();
    await executarFerramenta("bs_indicacao", { orcamento_id: ORCAMENTO_ID, medico: "ana", confirmar: true }, amb);
    expect(deps.definirIndicacao).toHaveBeenCalledWith(amb.ctx, { orcamento_id: ORCAMENTO_ID, medico_indicador_id: "m-1" });
  });

  it("bs_fechar sem confirmar mostra o checklist e não fecha", async () => {
    const { amb, deps } = criarAmbiente();
    const r = await executarFerramenta("bs_fechar", { clinica: "Hirata", mes: "2026-09" }, amb);
    expect(r).toMatchObject({ gravado: false, previa: { checklist: ["✅ sync: ok"] } });
    expect(deps.fecharMes).not.toHaveBeenCalled();

    await executarFerramenta("bs_fechar", { clinica: "Hirata", mes: "2026-09", confirmar: true, decisoes: [{ texto: "ok" }] }, amb);
    expect(deps.fecharMes).toHaveBeenCalledWith(amb.ctx, { clinica_id: CLINICA_ID, mes: "2026-09", decisoes: [{ texto: "ok" }], divergencias: [] });
  });

  it("bs_sync e bs_reabrir só gravam com confirmar=true", async () => {
    const { amb, deps } = criarAmbiente();
    await executarFerramenta("bs_sync", { clinica: "Hirata", mes: "2026-09" }, amb);
    await executarFerramenta("bs_reabrir", { clinica: "Hirata", mes: "2026-09", motivo: "ajuste" }, amb);
    expect(deps.sincronizarMes).not.toHaveBeenCalled();
    expect(deps.reabrirMes).not.toHaveBeenCalled();

    await executarFerramenta("bs_reabrir", { clinica: "Hirata", mes: "2026-09", motivo: "ajuste", confirmar: true }, amb);
    expect(deps.reabrirMes).toHaveBeenCalledWith(amb.ctx, { clinica_id: CLINICA_ID, mes: "2026-09", motivo: "ajuste" });
  });

  it("bs_relatorio exige tipo, resolve a clínica e marca o uso do relatório", async () => {
    const { amb, deps } = criarAmbiente();
    await expect(executarFerramenta("bs_relatorio", { clinica: "Hirata", mes: "2026-09" }, amb)).rejects.toThrow();
    await expect(executarFerramenta("bs_relatorio", { clinica: "Hirata", mes: "2026-09", tipo: "todos" }, amb)).rejects.toThrow();
    expect(deps.relatorioMensal).not.toHaveBeenCalled();

    const r = await executarFerramenta("bs_relatorio", { clinica: "hirata", mes: "2026-09", tipo: "parceiro" }, amb);
    expect(deps.relatorioMensal).toHaveBeenCalledWith(amb.ctx, { clinica_id: CLINICA_ID, mes: "2026-09", tipo: "parceiro" });
    expect(r).toMatchObject({ tipo: "parceiro", uso: expect.stringMatching(/PARCEIRO/) });

    const i = await executarFerramenta("bs_relatorio", { clinica: "Hirata", mes: "2026-09", tipo: "interno" }, amb);
    expect(i).toMatchObject({ tipo: "interno", uso: expect.stringMatching(/CONFIDENCIAL/) });
  });

  it("valida input com o schema da tool", async () => {
    const { amb } = criarAmbiente();
    await expect(executarFerramenta("bs_status", { clinica: "Hirata", mes: "set/26" }, amb)).rejects.toThrow();
  });
});

describe("resolver", () => {
  it("resolverPorNome: exato, parcial, ambíguo e inexistente", () => {
    expect(resolverPorNome(catalogo.procedimentos, "consulta", "Procedimento").id).toBe("p-cons");
    expect(resolverPorNome(catalogo.procedimentos, "clareamento", "Procedimento").id).toBe("p-clar");
    expect(() => resolverPorNome(catalogo.procedimentos, "xyz", "Procedimento")).toThrow(/não encontrada/);
    expect(() => resolverPorNome([...catalogo.procedimentos, { id: "p2", nome: "Consulta Retorno", custo_fixo: 0, categoria: null }], "consul", "Procedimento")).toThrow(/ambígua/);
  });

  it("resolverClinica aceita id, subscriber e nome sem acento", () => {
    expect(resolverClinica(catalogo.clinicas, CLINICA_ID).nome).toBe("Hirata Odontologia");
    expect(resolverClinica(catalogo.clinicas, "HIRATA").id).toBe(CLINICA_ID);
    expect(resolverClinica(catalogo.clinicas, "clinica sorriso").nome).toBe("Clínica Sorriso");
  });

  it("prepararLinhasDoMes recusa data inválida e lista vazia", () => {
    expect(() => prepararLinhasDoMes([], "2026-09")).toThrow(/Nenhuma linha/);
    expect(() => prepararLinhasDoMes([{ data: "ontem", paciente: "A", procedimento: "B" }], "2026-09")).toThrow(/data inválida/);
  });

  it("montarProcedimentosFinais remove duplicata confirmada e ignora resolução null", () => {
    const finais = montarProcedimentosFinais(
      mapeamento,
      [],
      [{ data: "2026-09-03", paciente: "Maria Souza", parte: "Avaliação", procedimento: null }],
      [{ data: "2026-09-03", paciente: "maria souza", parte: "clareamento" }],
      catalogo.procedimentos
    );
    expect(finais).toEqual([]);
  });
});

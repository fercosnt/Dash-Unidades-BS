import {
  mapearProcedimentos,
  normalizarTexto,
  type ProcedimentoCatalogo,
  type RegraProcedimento,
} from "./mapear-procedimentos";

const catalogo: ProcedimentoCatalogo[] = [
  { id: "apneia6", nome: "Beauty Sleep - Apneia (6 Sessões)", custo_fixo: 380 },
  { id: "bio", nome: "Exame Biologix", custo_fixo: 100 },
  { id: "consulta", nome: "Consulta", custo_fixo: 0 },
  { id: "clar1", nome: "Clareamento (1 sessão)", custo_fixo: 190 },
  { id: "clar4", nome: "Clareamento (4 sessões)", custo_fixo: 190 },
  { id: "desinf", nome: "Desinfecção Periodontal", custo_fixo: 300 },
  { id: "alinhador", nome: "Alinhador Fotona", custo_fixo: 5750 },
  { id: "limpeza", nome: "Limpeza a Laser (1 sessão)", custo_fixo: 300 },
];

let seq = 0;
const regra = (padrao: string, procedimento_id: string | null, prioridade: number, clinica_id: string | null = null): RegraProcedimento => ({
  id: `r${++seq}`,
  padrao,
  procedimento_id,
  ignorar: procedimento_id === null,
  prioridade,
  clinica_id,
});

// Espelha o seed da migration 027
const regras: RegraProcedimento[] = [
  regra("alinhador invisivel", "alinhador", 10),
  regra("entrega de alinhadores", null, 10),
  regra("fotobiomodula", null, 20),
  regra("foto inicia", null, 20),
  regra("pedido", null, 20),
  regra("consulta", "consulta", 30),
  regra("biologix", "bio", 40),
  regra("apneia (6", "apneia6", 50),
  regra("clareamento dental com laser fotona (sessao unica", "clar1", 60),
  regra("clareamento", "clar4", 70),
  regra("limpeza", "limpeza", 70),
  regra("desinfec", "desinf", 70),
];

const linha = (data: string, paciente: string, procedimento: string) => ({ data, paciente, procedimento });

describe("normalizarTexto", () => {
  it("remove acento, baixa caixa e colapsa espaços", () => {
    expect(normalizarTexto("  Clareamento   (Sessão ÚNICA) ")).toBe("clareamento (sessao unica)");
  });
});

describe("mapearProcedimentos", () => {
  it("separa descrição com '+' em vários procedimentos", () => {
    const r = mapearProcedimentos(
      [linha("2026-03-02", "Valdir", "Protocolo para diminuição da Apneia (6 sessões) - sessão 2 + Entrega Biologix")],
      regras,
      catalogo
    );
    expect(r.mapeadas.map((m) => m.procedimento_nome)).toEqual(["Beauty Sleep - Apneia (6 Sessões)", "Exame Biologix"]);
    expect(r.custoTotal).toBe(480);
  });

  it("'Laser Fotona' não cai na regra de foto inicial", () => {
    const r = mapearProcedimentos(
      [linha("2026-07-01", "Mirocem", "Clareamento dental com Laser Fotona (Sessão Única) 1/1")],
      regras,
      catalogo
    );
    expect(r.ignoradas).toHaveLength(0);
    expect(r.mapeadas[0]!.procedimento_nome).toBe("Clareamento (1 sessão)");
  });

  it("ignora fotobiomodulação, fotos e pedidos", () => {
    const r = mapearProcedimentos(
      [
        linha("2026-03-25", "Mauricio Yagui Hirata", "fotobiomodulação região de garganta - sessão 1"),
        linha("2026-07-01", "Mirocem", "foto inicial"),
        linha("2026-09-23", "Rivereto", "pedido de rx"),
      ],
      regras,
      catalogo
    );
    expect(r.mapeadas).toHaveLength(0);
    expect(r.ignoradas).toHaveLength(3);
  });

  it("alinhador vence fotobiomodulação no mesmo texto (prioridade)", () => {
    const r = mapearProcedimentos(
      [
        linha("2026-08-20", "Maitê", "Alinhador invisivel Beauty Smile e Fotobiomodulação Laser Fotona"),
        linha("2026-09-04", "Maitê", "Entrega de Alinhadores numero 2 e fotobiomodulação"),
      ],
      regras,
      catalogo
    );
    expect(r.mapeadas.map((m) => m.procedimento_nome)).toEqual(["Alinhador Fotona"]);
    expect(r.ignoradas).toHaveLength(1);
    expect(r.custoTotal).toBe(5750);
  });

  it("texto sem regra vira ambígua", () => {
    const r = mapearProcedimentos(
      [linha("2026-05-06", "Maitê", "Remoção de Contenção fixa inferior + Profilaxia com Airflow")],
      regras,
      catalogo
    );
    expect(r.ambiguas.map((a) => a.parte)).toEqual(["Remoção de Contenção fixa inferior", "Profilaxia com Airflow"]);
  });

  it("aponta possível duplicata no mesmo dia/paciente/procedimento", () => {
    const r = mapearProcedimentos(
      [
        linha("2026-09-18", "Yang Weihui (Jeniffer)", "Desinfecção Periodontal Protocolo com Laser Fotona 1/6"),
        linha("2026-09-18", "Yang Weihui (Jeniffer)", "Desinfecção Periodontal Protocolo com Laser Fotona - sessão 2"),
        linha("2026-09-18", "Yang Weihui (Jeniffer)", "Clareamento dental com Laser Fotona (4 Sessões) 1/4"),
      ],
      regras,
      catalogo
    );
    expect(r.possiveisDuplicatas).toEqual([
      expect.objectContaining({ procedimento_nome: "Desinfecção Periodontal", partes: expect.arrayContaining([expect.any(String), expect.any(String)]) }),
    ]);
    // não remove: decisão é do usuário
    expect(r.mapeadas).toHaveLength(3);
  });

  it("regra da clínica vence a global na mesma prioridade", () => {
    const especifica = regra("profilaxia", null, 70, "hirata");
    const global = regra("profilaxia", "limpeza", 70, null);
    const linhas = [linha("2026-05-06", "X", "Profilaxia com Airflow")];

    expect(mapearProcedimentos(linhas, [global, especifica], catalogo, "hirata").ignoradas).toHaveLength(1);
    expect(mapearProcedimentos(linhas, [global, especifica], catalogo, "outra").mapeadas).toHaveLength(1);
  });
});

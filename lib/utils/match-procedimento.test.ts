import { matchProcedimentoPorNome, ProcedimentoMatch } from "./match-procedimento";

// Procedimentos baseados na migration 014
const PROCS: ProcedimentoMatch[] = [
  { id: "p1", nome: "Alinhador Fotona", codigo_clinicorp: "Alinhador invisivel Beauty Smile e Fotobiomodulação Laser Fotona" },
  { id: "p2", nome: "Clareamento (4 sessões)", codigo_clinicorp: "Clareamento dental com Laser Fotona (4 Sessões)" },
  { id: "p3", nome: "Clareamento Dental (Manutenção)", codigo_clinicorp: "Clareamento dental com Laser Fotona (Manutenção)" },
  { id: "p4", nome: "Clareamento Dental (Sessão Extra)", codigo_clinicorp: "Clareamento dental com Laser Fotona (Sessão Extra)" },
  { id: "p5", nome: "Clareamento (1 sessão)", codigo_clinicorp: "Clareamento dental com Laser Fotona (Sessão Única)" },
  { id: "p6", nome: "Consulta", codigo_clinicorp: "Consulta e avaliação" },
  { id: "p7", nome: "Contenção Alinhador", codigo_clinicorp: "Contenção pós Alinhador e Fotobiomodulação Laser Fotona" },
  { id: "p8", nome: "Desinfecção Periodontal", codigo_clinicorp: "Desinfecção Periodontal Protocolo com Laser Fotona" },
  { id: "p9", nome: "Limpeza a Laser (Manutenção)", codigo_clinicorp: "Limpeza Dental com Laser Fotona (Manutenção)" },
  { id: "p10", nome: "Limpeza a Laser (1 sessão)", codigo_clinicorp: "Limpeza Dental com Laser Fotona (Sessão Única)" },
  { id: "p11", nome: "Beauty Sleep - Apneia (1 sessão)", codigo_clinicorp: "Protocolo para diminuição da Apneia (1 sessão)" },
  { id: "p12", nome: "Beauty Sleep - Apneia (4 Sessões)", codigo_clinicorp: "Protocolo para diminuição da Apneia (4 sessões)" },
  { id: "p13", nome: "Beauty Sleep - Ronco (1 sessão)", codigo_clinicorp: "Protocolo para diminuição do Ronco (1 sessão)" },
  { id: "p14", nome: "Beauty Sleep - Ronco (4 Sessões)", codigo_clinicorp: "Protocolo para diminuição do ronco (4 sessões)" },
  { id: "p15", nome: "Sensibilidade (Manutenção)", codigo_clinicorp: "Sensibilidade dental manutenção com laser Fotona" },
  { id: "p16", nome: "Sensibilidade (Elemento)", codigo_clinicorp: "Sensibilidade dental Protocolo com Laser Fotona (elemento)" },
  { id: "p17", nome: "Sensibilidade (Extra)", codigo_clinicorp: "Sensibilidade dental Sessao Extra com Laser Fotona" },
];

describe("matchProcedimentoPorNome — match exato por codigo_clinicorp", () => {
  it("match exato pelo texto completo do Clinicorp", () => {
    const result = matchProcedimentoPorNome(
      "Alinhador invisivel Beauty Smile e Fotobiomodulação Laser Fotona",
      PROCS
    );
    expect(result?.id).toBe("p1");
  });

  it("match exato case-insensitive", () => {
    const result = matchProcedimentoPorNome(
      "alinhador invisivel beauty smile e fotobiomodulação laser fotona",
      PROCS
    );
    expect(result?.id).toBe("p1");
  });

  it("match com acentos variados (NFD normalization)", () => {
    // "Sessões" vs "Sessoes" — normalização deve tratar
    const result = matchProcedimentoPorNome(
      "Clareamento dental com Laser Fotona (4 Sessoes)",
      PROCS
    );
    expect(result?.id).toBe("p2");
  });

  it("match exato para Consulta e avaliação", () => {
    const result = matchProcedimentoPorNome("Consulta e avaliação", PROCS);
    expect(result?.id).toBe("p6");
  });

  it("match exato para Consulta e avaliacao (sem acento)", () => {
    const result = matchProcedimentoPorNome("Consulta e avaliacao", PROCS);
    expect(result?.id).toBe("p6");
  });
});

describe("matchProcedimentoPorNome — match exato por nome", () => {
  it("match pelo nome curto cadastrado", () => {
    const result = matchProcedimentoPorNome("Consulta", PROCS);
    expect(result?.id).toBe("p6");
  });

  it("match pelo nome curto case-insensitive", () => {
    const result = matchProcedimentoPorNome("consulta", PROCS);
    expect(result?.id).toBe("p6");
  });

  it("match pelo nome com parênteses", () => {
    const result = matchProcedimentoPorNome("Clareamento (4 sessões)", PROCS);
    expect(result?.id).toBe("p2");
  });
});

describe("matchProcedimentoPorNome — match por prefixo", () => {
  it("texto da planilha é prefixo do nome cadastrado", () => {
    const result = matchProcedimentoPorNome("Alinhador", PROCS);
    expect(result?.id).toBe("p1");
  });

  it("nome cadastrado é prefixo do texto da planilha", () => {
    const result = matchProcedimentoPorNome("Consulta avançada com exames", PROCS);
    expect(result?.id).toBe("p6");
  });
});

describe("matchProcedimentoPorNome — diferenciação entre procedimentos similares", () => {
  it("diferencia Clareamento 4 sessões de Manutenção via codigo_clinicorp", () => {
    const r1 = matchProcedimentoPorNome(
      "Clareamento dental com Laser Fotona (4 Sessões)",
      PROCS
    );
    const r2 = matchProcedimentoPorNome(
      "Clareamento dental com Laser Fotona (Manutenção)",
      PROCS
    );
    expect(r1?.id).toBe("p2");
    expect(r2?.id).toBe("p3");
    expect(r1?.id).not.toBe(r2?.id);
  });

  it("diferencia Beauty Sleep Apneia de Ronco", () => {
    const r1 = matchProcedimentoPorNome(
      "Protocolo para diminuição da Apneia (1 sessão)",
      PROCS
    );
    const r2 = matchProcedimentoPorNome(
      "Protocolo para diminuição do Ronco (1 sessão)",
      PROCS
    );
    expect(r1?.id).toBe("p11");
    expect(r2?.id).toBe("p13");
  });

  it("diferencia Sensibilidade Manutenção de Elemento de Extra", () => {
    const r1 = matchProcedimentoPorNome(
      "Sensibilidade dental manutenção com laser Fotona",
      PROCS
    );
    const r2 = matchProcedimentoPorNome(
      "Sensibilidade dental Protocolo com Laser Fotona (elemento)",
      PROCS
    );
    const r3 = matchProcedimentoPorNome(
      "Sensibilidade dental Sessao Extra com Laser Fotona",
      PROCS
    );
    expect(r1?.id).toBe("p15");
    expect(r2?.id).toBe("p16");
    expect(r3?.id).toBe("p17");
  });
});

describe("matchProcedimentoPorNome — sem match", () => {
  it("retorna null para procedimento inexistente", () => {
    const result = matchProcedimentoPorNome("Implante Dentário Completo", PROCS);
    expect(result).toBeNull();
  });

  it("retorna null para string vazia", () => {
    expect(matchProcedimentoPorNome("", PROCS)).toBeNull();
  });

  it("retorna null para espaços em branco", () => {
    expect(matchProcedimentoPorNome("   ", PROCS)).toBeNull();
  });
});

describe("matchProcedimentoPorNome — prioridade de match", () => {
  it("codigo_clinicorp tem prioridade sobre nome parcial", () => {
    // "Clareamento dental com Laser Fotona (Sessão Extra)" deve matchear p4,
    // não p2 (que tem "Clareamento" no nome e seria match por prefixo)
    const result = matchProcedimentoPorNome(
      "Clareamento dental com Laser Fotona (Sessão Extra)",
      PROCS
    );
    expect(result?.id).toBe("p4");
  });
});

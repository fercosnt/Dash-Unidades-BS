import { transformOrcamentos, transformTratamentos } from "./xlsx-transforms";

describe("transformOrcamentos", () => {
  it("separa orçamentos fechados (APPROVED) e abertos", () => {
    const rows = [
      {
        "Status": "APPROVED",
        "Paciente": "João Silva (12)",
        "Valor Total Com Desconto": "1.000,00",
        "Data Criação": "01/02/2026",
        "Como conheceu?": "Indicado por amigo",
        "Profissional": "Dr. A",
        "Telefone": "11999999999",
        "Procedimentos": "Tratamento X",
        "Valor": "1.200,00",
        "Desconto-Porcentagem": "10,00",
        "Desconto-Reais": "200,00",
        "Observações": "ok",
      },
      {
        "Status": "PENDING",
        "Paciente": "Maria Souza",
        "Valor Total Com Desconto": "500,00",
        "Data Criação": "10/02/2026",
        "Profissional": "Dr. B",
      },
    ];

    const { fechados, abertos } = transformOrcamentos(rows, "clinica-1", "2026-02-01");

    expect(fechados).toHaveLength(1);
    expect(abertos).toHaveLength(1);

    const f = fechados[0]!;
    expect(f.paciente_nome).toBe("João Silva");
    expect(f.valor_total).toBe(1000);
    expect(f.data_fechamento).toBe("2026-02-01");
    expect(f.tem_indicacao).toBe(true);
    expect(f.profissional).toBe("Dr. A");

    const a = abertos[0]!;
    expect(a.paciente_nome).toBe("Maria Souza");
    expect(a.valor_total).toBe(500);
    expect(a.data_criacao).toBe("2026-02-10");
    expect(a.status).toBe("PENDING");
  });
});

describe("transformTratamentos", () => {
  it("faz split da coluna Procedimento por '+' gerando vários registros", () => {
    const rows = [
      {
        "Paciente": "Maria (3)",
        "Procedimento": "Botox + Preenchimento",
        "Executado": "10/03/2026",
        "Valor": "2.000,00",
        "Profissional": "Dr. C",
        "Região": "Rosto",
      },
    ];

    const result = transformTratamentos(rows, "clinica-1", "2026-03-01");

    expect(result).toHaveLength(2);
    const nomes = result.map((r) => r.procedimento_nome).sort();
    expect(nomes).toEqual(["Botox", "Preenchimento"]);
    result.forEach((r) => {
      expect(r.paciente_nome).toBe("Maria");
      expect(r.data_execucao).toBe("2026-03-10");
      expect(r.quantidade).toBe(1);
      expect(r.valor).toBe(2000);
      expect(r.profissional).toBe("Dr. C");
      expect(r.regiao).toBe("Rosto");
    });
  });

  it("mantém um único registro quando não há '+' na coluna Procedimento", () => {
    const rows = [
      {
        "Paciente": "Carlos",
        "Procedimento": "Laser",
        "Executado": "05/04/2026",
        "Valor": "300,00",
      },
    ];

    const result = transformTratamentos(rows, "clinica-1", "2026-04-01");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      paciente_nome: "Carlos",
      procedimento_nome: "Laser",
      data_execucao: "2026-04-05",
      quantidade: 1,
      valor: 300,
    });
  });
}


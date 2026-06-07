import { montarExtrato } from "./extrato-parceiro";

describe("montarExtrato", () => {
  it("começa pelo saldo de abertura (taxa de implementação)", () => {
    const ext = montarExtrato(-250000, "2026-01", [], [], []);
    expect(ext[0]).toMatchObject({ tipo: "abertura", valor: -250000, saldo: -250000 });
  });

  it("acumula resultados mensais sobre a abertura", () => {
    const ext = montarExtrato(
      -250000,
      "2026-01",
      [
        { mes: "2026-01", resultado: -3483.44 },
        { mes: "2026-02", resultado: 2331.2 },
      ],
      [],
      []
    );
    expect(ext.at(-1)!.saldo).toBeCloseTo(-251152.24, 2);
  });

  it("conta única que abre em 0 (implementação à vista)", () => {
    const ext = montarExtrato(0, "2026-01", [{ mes: "2026-01", resultado: 1000 }], [], []);
    expect(ext.at(-1)!.saldo).toBeCloseTo(1000, 2);
  });

  it("repasse em dinheiro debita o saldo", () => {
    const ext = montarExtrato(
      0,
      "2026-01",
      [{ mes: "2026-01", resultado: 5000 }],
      [],
      [{ mes: "2026-02", valor: 2000 }]
    );
    expect(ext.at(-1)!).toMatchObject({ tipo: "repasse" });
    expect(ext.at(-1)!.saldo).toBeCloseTo(3000, 2);
  });

  it("pagamento da implementação (parceiro→BS) soma como evento +", () => {
    const ext = montarExtrato(
      -250000,
      "2026-01",
      [],
      [{ mes: "2026-02", valor: 5000 }],
      []
    );
    expect(ext.at(-1)!).toMatchObject({ tipo: "pagamento_implementacao", valor: 5000 });
    expect(ext.at(-1)!.saldo).toBeCloseTo(-245000, 2);
  });

  it("repassa o id do movimento (refId) na linha de repasse, p/ desfazer na UI", () => {
    const ext = montarExtrato(
      0,
      "2026-01",
      [{ mes: "2026-01", resultado: 5000 }],
      [],
      [{ mes: "2026-02", valor: 2000, id: "rep-123" }]
    );
    expect(ext.at(-1)!).toMatchObject({ tipo: "repasse", refId: "rep-123" });
  });

  it("ordena cronologicamente; resultado antes do repasse no mesmo mês", () => {
    const ext = montarExtrato(
      0,
      "2026-01",
      [{ mes: "2026-01", resultado: 1000 }],
      [],
      [{ mes: "2026-01", valor: 400 }]
    );
    expect(ext.map((e) => e.tipo)).toEqual(["abertura", "resultado", "repasse"]);
    expect(ext.at(-1)!.saldo).toBeCloseTo(600, 2);
  });

  it("reproduz o extrato da Hirata (anchor revisado 2026-06-07)", () => {
    const ext = montarExtrato(
      -250000,
      "2026-01",
      [
        { mes: "2026-01", resultado: -3483.44 },
        { mes: "2026-02", resultado: 2331.2 },
        { mes: "2026-03", resultado: -1850.24 },
        { mes: "2026-04", resultado: 632.64 },
        { mes: "2026-05", resultado: 2658.0 },
        { mes: "2026-06", resultado: 6010.0 },
      ],
      [],
      []
    );
    const mai = ext.find((e) => e.mes === "2026-05" && e.tipo === "resultado")!;
    expect(mai.saldo).toBeCloseTo(-249711.84, 2);
    expect(ext.at(-1)!.saldo).toBeCloseTo(-243701.84, 2);
  });
});

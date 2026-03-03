import { removeHeaderRow, removeTotalizationRow, parseToObjects } from "./xlsx-parser";

describe("removeHeaderRow", () => {
  it("separa header e remove linhas totalmente vazias", () => {
    const data: unknown[][] = [
      ["Paciente", "Valor Total", "Ticket Médio"],
      ["Ana", "1.000,00", "500,00"],
      ["", "", ""],
      ["Bruno", "2.000,00", "1.000,00"],
    ];

    const { headers, rows } = removeHeaderRow(data);

    expect(headers).toEqual(["Paciente", "Valor Total", "Ticket Médio"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(["Ana", "1.000,00", "500,00"]);
    expect(rows[1]).toEqual(["Bruno", "2.000,00", "1.000,00"]);
  });
});

describe("removeTotalizationRow", () => {
  it("remove linha totalizadora quando paciente está vazio e valor/ticket preenchidos", () => {
    const headers = ["Paciente", "Valor Total", "Ticket Médio"];
    const rows: unknown[][] = [
      ["Ana", "1.000,00", "500,00"],
      ["Bruno", "2.000,00", "1.000,00"],
      ["", "3.000,00", "750,00"], // totalização
    ];

    const cleaned = removeTotalizationRow(rows, headers);

    expect(cleaned).toHaveLength(2);
    expect(cleaned[1]).toEqual(["Bruno", "2.000,00", "1.000,00"]);
  });

  it("mantém última linha quando não parece totalizadora", () => {
    const headers = ["Paciente", "Valor Total", "Ticket Médio"];
    const rows: unknown[][] = [
      ["Ana", "1.000,00", "500,00"],
      ["TOTAL", "", ""],
    ];

    const cleaned = removeTotalizationRow(rows, headers);

    expect(cleaned).toHaveLength(2);
    expect(cleaned[1]).toEqual(["TOTAL", "", ""]);
  });
});

describe("parseToObjects", () => {
  it("converte linhas em objetos usando headers", () => {
    const headers = ["Paciente", "Valor Total"];
    const rows: unknown[][] = [
      ["Ana", "1.000,00"],
      ["Bruno", "2.000,00"],
    ];

    const objects = parseToObjects(headers, rows);

    expect(objects).toEqual([
      { "Paciente": "Ana", "Valor Total": "1.000,00" },
      { "Paciente": "Bruno", "Valor Total": "2.000,00" },
    ]);
  });
});


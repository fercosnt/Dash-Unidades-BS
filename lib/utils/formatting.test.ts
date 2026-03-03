import {
  parseCurrencyBR,
  parseDateBR,
  cleanPatientName,
  detectIndication,
  formatCurrency,
  formatDate,
} from "./formatting";

describe("parseCurrencyBR", () => {
  it("converte formato BR para número", () => {
    expect(parseCurrencyBR("14.450,00")).toBe(14450);
    expect(parseCurrencyBR("1.234,56")).toBe(1234.56);
    expect(parseCurrencyBR("0,50")).toBe(0.5);
  });

  it("retorna 0 para vazio ou inválido", () => {
    expect(parseCurrencyBR("")).toBe(0);
    expect(parseCurrencyBR("   ")).toBe(0);
    expect(parseCurrencyBR("abc")).toBe(0);
    expect(parseCurrencyBR(null as unknown as string)).toBe(0);
  });

  it("remove espaços e trata valores grandes", () => {
    expect(parseCurrencyBR("1 234,56")).toBe(1234.56);
    expect(parseCurrencyBR("10.000.000,00")).toBe(10000000);
  });
});

describe("parseDateBR", () => {
  it("converte DD/MM/YYYY para YYYY-MM-DD", () => {
    expect(parseDateBR("01/03/2026")).toBe("2026-03-01");
    expect(parseDateBR("31/12/2025")).toBe("2025-12-31");
    expect(parseDateBR("5/7/2024")).toBe("2024-07-05");
  });

  it("retorna null para vazio ou formato inválido", () => {
    expect(parseDateBR("")).toBeNull();
    expect(parseDateBR("   ")).toBeNull();
    expect(parseDateBR("2026-03-01")).toBeNull();
    expect(parseDateBR("32/01/2026")).toBeNull();
    expect(parseDateBR(null as unknown as string)).toBeNull();
  });
});

describe("cleanPatientName", () => {
  it("remove número entre parênteses no final", () => {
    expect(cleanPatientName("Fabio Sakuma (18)")).toBe("Fabio Sakuma");
    expect(cleanPatientName("Ana (1)")).toBe("Ana");
  });

  it("mantém nome sem parênteses", () => {
    expect(cleanPatientName("Maria Silva")).toBe("Maria Silva");
    expect(cleanPatientName("José (outro)")).toBe("José (outro)");
  });

  it("retorna string vazia para null", () => {
    expect(cleanPatientName(null as unknown as string)).toBe("");
  });
});

describe("detectIndication", () => {
  it("retorna true quando contém Indicado por", () => {
    expect(detectIndication("Indicado por Dr. João")).toBe(true);
    expect(detectIndication("  indicado por   ")).toBe(true);
  });

  it("retorna false quando não contém", () => {
    expect(detectIndication("Google")).toBe(false);
    expect(detectIndication("")).toBe(false);
    expect(detectIndication(null as unknown as string)).toBe(false);
  });
});

describe("formatCurrency", () => {
  it("formata número como moeda BR", () => {
    expect(formatCurrency(14450)).toMatch(/14\.450/);
    expect(formatCurrency(0)).toMatch(/0/);
    expect(formatCurrency(1234.56)).toMatch(/1\.234/);
  });
});

describe("formatDate", () => {
  it("formata data ISO para exibição", () => {
    expect(formatDate("2026-03-01")).toMatch(/01\/03\/2026|1\/3\/2026/);
  });

  it("retorna em dash para null ou vazio", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("")).toBe("—");
  });
});

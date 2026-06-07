export type ResultadoMensal = { mes: string; resultado: number };
export type Movimento = { mes: string; valor: number; id?: string };
export type LinhaExtrato = {
  mes: string;
  tipo: "abertura" | "resultado" | "pagamento_implementacao" | "repasse";
  valor: number; // abertura/resultado/pagamento somam (±); repasse subtrai
  saldo: number;
  refId?: string; // id do movimento de origem (repasse/pagamento), p/ ações na UI
};

/**
 * Monta o extrato (conta corrente única) do parceiro.
 * Linha 1 = saldo de abertura (taxa de implementação, −valor_total; ou 0 se sem dívida).
 * Depois intercala, em ordem cronológica: resultados mensais (±), pagamentos da
 * implementação em dinheiro (+, parceiro→BS) e repasses (−, BS→parceiro), com saldo corrido.
 */
export function montarExtrato(
  saldoInicial: number,
  mesAbertura: string,
  resultados: ResultadoMensal[],
  pagamentosImplementacao: Movimento[],
  repasses: Movimento[]
): LinhaExtrato[] {
  const eventos: Omit<LinhaExtrato, "saldo">[] = [
    { mes: mesAbertura, tipo: "abertura", valor: saldoInicial },
    ...resultados.map((r) => ({ mes: r.mes, tipo: "resultado" as const, valor: r.resultado })),
    ...pagamentosImplementacao.map((p) => ({
      mes: p.mes,
      tipo: "pagamento_implementacao" as const,
      valor: Math.abs(p.valor),
      refId: p.id,
    })),
    ...repasses.map((p) => ({
      mes: p.mes,
      tipo: "repasse" as const,
      valor: -Math.abs(p.valor),
      refId: p.id,
    })),
  ];
  const ordem = { abertura: 0, pagamento_implementacao: 1, resultado: 2, repasse: 3 } as const;
  eventos.sort((a, b) =>
    a.mes === b.mes ? ordem[a.tipo] - ordem[b.tipo] : a.mes < b.mes ? -1 : 1
  );

  let saldo = 0;
  return eventos.map((e) => {
    saldo = Math.round((saldo + e.valor) * 100) / 100;
    return { ...e, saldo };
  });
}

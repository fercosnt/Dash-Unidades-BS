"use client";
import type { ReactNode } from "react";
import type { ContaCorrente } from "@/lib/saldo-parceiro-queries";
import type { LinhaExtrato } from "@/lib/utils/extrato-parceiro";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatMes(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[Number(mo) - 1]}/${y}`;
}

const TIPO_LABEL: Record<LinhaExtrato["tipo"], string> = {
  abertura: "Abertura — Taxa de implementação",
  resultado: "Resultado do mês",
  pagamento_implementacao: "Pagamento da implementação",
  repasse: "Repasse em dinheiro",
};

/**
 * Visão read-only da conta corrente (saldo decomposto RF-10 + extrato), compartilhada
 * entre admin e parceiro (DRY). `repasseAction`, se passado, renderiza uma ação por linha
 * de repasse (ex: desfazer no admin); omitido = somente leitura (parceiro).
 */
export function ContaCorrenteView({
  conta,
  repasseAction,
}: {
  conta: ContaCorrente;
  repasseAction?: (refId: string) => ReactNode;
}) {
  return (
    <div className="space-y-6">
      {/* Saldo decomposto (RF-10) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-md">
          <p className="text-xs font-medium text-neutral-500">Taxa de implementação a amortizar</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900">
            {conta.dividaImplementacao ? formatCurrency(conta.dividaImplementacao.aAmortizar) : "—"}
          </p>
          {conta.dividaImplementacao && (
            <p className="mt-1 text-xs text-neutral-400">
              de {formatCurrency(conta.dividaImplementacao.valorTotal)} ·{" "}
              {conta.dividaImplementacao.descricao}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-white p-5 shadow-md">
          <p className="text-xs font-medium text-neutral-500">Resultado operacional acumulado</p>
          <p
            className={`mt-2 text-2xl font-bold tabular-nums ${
              conta.operacionalAcumulado >= 0 ? "text-green-700" : "text-red-600"
            }`}
          >
            {formatCurrency(conta.operacionalAcumulado)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">Σ resultados − Σ repasses</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-md ring-2 ring-primary-100">
          <p className="text-xs font-medium text-neutral-500">Saldo da conta</p>
          <p
            className={`mt-2 text-2xl font-bold tabular-nums ${
              conta.saldo > 0 ? "text-green-700" : "text-red-600"
            }`}
          >
            {formatCurrency(conta.saldo)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            {conta.saldo > 0 ? "BS deve ao parceiro" : "Parceiro deve à BS (implementação + float)"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-white/80">
        <span>
          Competência acumulada (referência):{" "}
          <strong className="text-white">{formatCurrency(conta.competenciaAcumulada)}</strong>
        </span>
        <span>· O parceiro recebe em dinheiro quando o saldo ficar positivo.</span>
      </div>

      {/* Extrato */}
      <div className="overflow-hidden rounded-xl bg-white shadow-md">
        <div className="border-b border-neutral-100 px-6 py-4">
          <h3 className="text-sm font-bold text-neutral-900">Extrato</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-xs text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">Mês</th>
              <th className="px-4 py-3 text-left font-medium">Lançamento</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3 text-right font-medium">Saldo</th>
              {repasseAction && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {conta.extrato.map((l, i) => (
              <tr
                key={`${l.mes}-${l.tipo}-${i}`}
                className={`border-b border-neutral-50 ${
                  l.tipo === "abertura" ? "bg-neutral-50 font-medium" : "hover:bg-neutral-50"
                }`}
              >
                <td className="px-4 py-3 text-neutral-600">{formatMes(l.mes)}</td>
                <td className="px-4 py-3 text-neutral-800">{TIPO_LABEL[l.tipo]}</td>
                <td
                  className={`px-4 py-3 text-right tabular-nums ${
                    l.valor >= 0 ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {formatCurrency(l.valor)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-medium tabular-nums ${
                    l.saldo >= 0 ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {formatCurrency(l.saldo)}
                </td>
                {repasseAction && (
                  <td className="px-4 py-3 text-right">
                    {l.tipo === "repasse" && l.refId ? repasseAction(l.refId) : null}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

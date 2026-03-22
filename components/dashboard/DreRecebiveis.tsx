"use client";

import type { DreRecebiveisData } from "@/types/dashboard.types";
import { formatCurrency } from "@/lib/utils/formatting";

function pct(value: number, base: number): string {
  if (base === 0) return "0,0%";
  return `${((value / base) * 100).toFixed(1).replace(".", ",")}%`;
}

type RowProps = {
  label: string;
  value: number;
  base: number;
  negative?: boolean;
  highlight?: boolean;
  indent?: boolean;
  highlightColor?: "primary" | "success" | "danger";
};

function DreRow({
  label,
  value,
  base,
  negative = false,
  highlight = false,
  indent = false,
  highlightColor = "primary",
}: RowProps) {
  const sign = negative ? "-" : "";

  const highlightStyles = {
    primary: "bg-primary-50 text-primary-900",
    success: "bg-emerald-50 text-emerald-700",
    danger: "bg-danger-50 text-danger-700",
  };

  const highlightTextStyles = {
    primary: "text-primary-900",
    success: "text-emerald-700",
    danger: "text-danger-700",
  };

  return (
    <div
      className={`flex items-center justify-between py-2 text-sm ${
        highlight
          ? `rounded-lg px-3 font-semibold ${highlightStyles[highlightColor]}`
          : "border-b border-neutral-100 px-1 text-neutral-700"
      } ${indent ? "pl-8" : ""}`}
    >
      <span className={highlight ? "font-semibold" : ""}>{label}</span>
      <div className="flex items-center gap-4 tabular-nums">
        <span className="w-24 text-right text-neutral-400 text-xs">{pct(value, base)}</span>
        <span
          className={`w-32 text-right font-medium ${
            negative
              ? "text-danger-700"
              : highlight
                ? highlightTextStyles[highlightColor]
                : "text-neutral-900"
          }`}
        >
          {sign}{formatCurrency(value)}
        </span>
      </div>
    </div>
  );
}

type Props = {
  data: DreRecebiveisData;
  className?: string;
};

export function DreRecebiveis({ data, className = "" }: Props) {
  const base = data.totalRecebido;

  if (base === 0) {
    return (
      <div className={`rounded-xl bg-white p-6 shadow-md ${className}`}>
        <h3 className="text-sm font-heading font-bold text-neutral-900 mb-4">
          Recebíveis — Visão Caixa
        </h3>
        <p className="mt-4 text-center text-xs text-neutral-400">
          Nenhum recebimento registrado neste período
        </p>
      </div>
    );
  }

  const liquidoPositivo = data.liquidoRecebido >= 0;

  return (
    <div className={`rounded-xl bg-white p-6 shadow-md ${className}`}>
      <h3 className="text-sm font-heading font-bold text-neutral-900 mb-4">
        Recebíveis — Visão Caixa
      </h3>

      <div className="space-y-0.5">
        {data.recebidoPix > 0 && (
          <DreRow label="+ PIX" value={data.recebidoPix} base={base} indent />
        )}
        {data.recebidoDinheiro > 0 && (
          <DreRow label="+ Dinheiro" value={data.recebidoDinheiro} base={base} indent />
        )}
        {data.recebidoDebitoAvista > 0 && (
          <DreRow label="+ Cartão Débito / Crédito à Vista" value={data.recebidoDebitoAvista} base={base} indent />
        )}
        {data.recebidoParcelasCartao > 0 && (
          <DreRow label="+ Parcelas Cartão Recebidas" value={data.recebidoParcelasCartao} base={base} indent />
        )}

        <DreRow
          label="= Total Recebido"
          value={data.totalRecebido}
          base={base}
          highlight
        />

        <DreRow
          label="(-) Taxa Real Cartão"
          value={data.taxaRealCartao}
          base={base}
          negative
        />

        <div className="my-2 border-t-2 border-neutral-300" />

        <DreRow
          label="= Líquido Recebido (entrou na conta)"
          value={data.liquidoRecebido}
          base={base}
          highlight
          highlightColor={liquidoPositivo ? "success" : "danger"}
        />
      </div>
    </div>
  );
}

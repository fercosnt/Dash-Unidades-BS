"use client";

import type { DreAdminData } from "@/types/dashboard.types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

function pct(value: number, base: number): string {
  if (base === 0) return "0,0%";
  return `${((value / base) * 100).toFixed(1).replace(".", ",")}%`;
}

type Props = {
  data: DreAdminData;
  className?: string;
};

type RowProps = {
  label: string;
  value: number;
  base: number;
  negative?: boolean;
  highlight?: boolean;
  indent?: boolean;
};

function DreRow({ label, value, base, negative = false, highlight = false, indent = false }: RowProps) {
  const sign = negative ? "-" : "";
  return (
    <div
      className={`flex items-center justify-between py-2 text-sm ${
        highlight
          ? "rounded-lg bg-primary-50 px-3 font-semibold text-primary-900"
          : "border-b border-neutral-100 px-1 text-neutral-700"
      } ${indent ? "pl-8" : ""}`}
    >
      <span className={highlight ? "font-semibold" : ""}>{label}</span>
      <div className="flex items-center gap-4 tabular-nums">
        <span className="w-24 text-right text-neutral-400 text-xs">{pct(value, base)}</span>
        <span className={`w-32 text-right font-medium ${negative ? "text-danger-700" : highlight ? "text-primary-900" : "text-neutral-900"}`}>
          {sign}{formatCurrency(value)}
        </span>
      </div>
    </div>
  );
}

export function DreCascata({ data, className = "" }: Props) {
  const pctBS = data.percentualBeautySmile;
  const pctClinica = 100 - pctBS;

  return (
    <div className={`rounded-xl bg-white p-6 shadow-md ${className}`}>
      <h3 className="text-sm font-heading font-bold text-neutral-900 mb-4">
        DRE — Resultado Econômico
      </h3>

      <div className="space-y-0.5">
        <DreRow
          label="Faturamento Bruto"
          value={data.faturamentoBruto}
          base={data.faturamentoBruto}
          highlight
        />
        <DreRow
          label="(-) Custo de Procedimentos"
          value={data.custosProcedimentos}
          base={data.faturamentoBruto}
          negative
        />
        <DreRow
          label="(-) Taxa Maquininha"
          value={data.taxaMaquininha}
          base={data.faturamentoBruto}
          negative
        />
        <DreRow
          label="(-) Impostos NF"
          value={data.impostosNf}
          base={data.faturamentoBruto}
          negative
        />
        <DreRow
          label="(-) Custo de Mão de Obra"
          value={data.custoMaoObra}
          base={data.faturamentoBruto}
          negative
        />
        <DreRow
          label="(-) Comissões Médicas"
          value={data.comissoesMedicas}
          base={data.faturamentoBruto}
          negative
        />

        <div className="my-2 border-t-2 border-neutral-300" />

        <DreRow
          label="= Valor Líquido"
          value={data.valorLiquido}
          base={data.faturamentoBruto}
          highlight
        />

        <DreRow
          label={`→ Beauty Smile (${pctBS}%)`}
          value={data.valorBeautySmile}
          base={data.faturamentoBruto}
          indent
        />
        {data.comissaoDentista > 0 && (
          <>
            <DreRow
              label="(-) Comissão Dentista"
              value={data.comissaoDentista}
              base={data.faturamentoBruto}
              negative
              indent
            />
            <DreRow
              label="= Resultado Líquido BS"
              value={data.resultadoLiquidoBS}
              base={data.faturamentoBruto}
              highlight
              indent
            />
          </>
        )}
        <DreRow
          label={`→ Clínica (${pctClinica}%)`}
          value={data.valorClinica}
          base={data.faturamentoBruto}
          indent
        />
      </div>

      {data.faturamentoBruto === 0 && (
        <p className="mt-4 text-center text-xs text-neutral-400">
          Resumo não calculado para este período
        </p>
      )}
    </div>
  );
}

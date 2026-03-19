"use client";

import type { RepasseAdminData } from "@/types/dashboard.types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

type Props = {
  data: RepasseAdminData;
  className?: string;
};

type RowProps = {
  label: string;
  value: number;
  negative?: boolean;
  highlight?: boolean;
  indent?: boolean;
  valueClass?: string;
};

function RepasseRow({ label, value, negative = false, highlight = false, indent = false, valueClass }: RowProps) {
  const sign = negative ? "-" : "";
  return (
    <div
      className={`flex items-center justify-between py-2 text-sm ${
        highlight
          ? "rounded-lg bg-accent/10 px-3 font-semibold text-accent-900"
          : "border-b border-neutral-100 px-1 text-neutral-700"
      } ${indent ? "pl-8" : ""}`}
    >
      <span>{label}</span>
      <span
        className={`tabular-nums font-medium ${
          valueClass ??
          (highlight
            ? "text-accent-800"
            : negative
            ? "text-danger-700"
            : "text-neutral-900")
        }`}
      >
        {sign}{formatCurrency(value)}
      </span>
    </div>
  );
}

export function RepasseMes({ data, className = "" }: Props) {
  const pctBS = data.percentualBeautySmile;
  const pctClinica = 100 - pctBS;

  return (
    <div className={`rounded-xl bg-white p-6 shadow-md ${className}`}>
      <h3 className="text-sm font-heading font-bold text-neutral-900 mb-1">
        Repasse do Mês
      </h3>
      <p className="text-xs text-neutral-400 mb-4">Base caixa — sobre o que foi recebido</p>

      <div className="space-y-0.5">
        <RepasseRow
          label="Total Recebido no Mês"
          value={data.totalRecebido}
          highlight
        />
        <RepasseRow
          label="(-) Taxa Maquininha (s/ recebido via cartão)"
          value={data.taxaSobreRecebido}
          negative
        />
        <RepasseRow
          label="(-) Impostos NF"
          value={data.impostosNf}
          negative
        />
        <RepasseRow
          label="(-) Custo de Mão de Obra"
          value={data.custoMaoObra}
          negative
        />
        <RepasseRow
          label="(-) Custo de Procedimentos"
          value={data.custosProcedimentos}
          negative
        />
        <RepasseRow
          label="(-) Comissões Médicas"
          value={data.comissoesMedicas}
          negative
        />

        <div className="my-2 border-t-2 border-neutral-300" />

        <RepasseRow
          label="= Disponível para Split"
          value={data.disponivelParaSplit}
          highlight
        />

        <div className="mt-3 rounded-xl border-2 border-accent bg-accent/5 p-4">
          <p className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wider">
            Transferência
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-700">→ Valor a Repassar ({pctClinica}%)</span>
            <span className="text-lg font-bold text-accent tabular-nums">
              {formatCurrency(data.valorRepassar)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
            <span>Beauty Smile retém ({pctBS}%)</span>
            <span className="tabular-nums">{formatCurrency(data.valorBeautySmileRetém)}</span>
          </div>
        </div>
      </div>

      {data.totalRecebido === 0 && (
        <p className="mt-4 text-center text-xs text-neutral-400">
          Sem recebimentos registrados neste período
        </p>
      )}
    </div>
  );
}

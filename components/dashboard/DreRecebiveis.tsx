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
  if (data.totalRecebido === 0 && data.receitaBsBruta === 0) {
    return (
      <div className={`rounded-xl bg-white p-6 shadow-md ${className}`}>
        <h3 className="text-sm font-heading font-bold text-neutral-900 mb-4">
          DRE Recebíveis — Visão Caixa
        </h3>
        <p className="mt-4 text-center text-xs text-neutral-400">
          Nenhum recebimento registrado neste período
        </p>
      </div>
    );
  }

  const baseEntradas = data.totalRecebido;
  const baseDre = data.receitaBsBruta;
  const hasDespesas = data.despesasPorCategoria.length > 0;
  const resultadoPositivo = data.resultadoUnidade >= 0;

  return (
    <div className={`rounded-xl bg-white p-6 shadow-md ${className}`}>
      <h3 className="text-sm font-heading font-bold text-neutral-900 mb-4">
        DRE Recebíveis — Visão Caixa
      </h3>

      <div className="space-y-0.5">
        {/* --- ENTRADAS DO MÊS --- */}
        <p className="text-xs font-medium uppercase text-neutral-500 mb-1">Entradas do Mês</p>
        {data.recebidoPix > 0 && (
          <DreRow label="+ PIX" value={data.recebidoPix} base={baseEntradas} indent />
        )}
        {data.recebidoDinheiro > 0 && (
          <DreRow label="+ Dinheiro" value={data.recebidoDinheiro} base={baseEntradas} indent />
        )}
        {data.recebidoDebitoAvista > 0 && (
          <DreRow label="+ Cartão Débito / Crédito à Vista" value={data.recebidoDebitoAvista} base={baseEntradas} indent />
        )}
        {data.recebidoParcelasCartao > 0 && (
          <DreRow label="+ Parcelas Cartão Recebidas" value={data.recebidoParcelasCartao} base={baseEntradas} indent />
        )}

        <DreRow
          label="= Total Recebido"
          value={data.totalRecebido}
          base={baseEntradas}
          highlight
        />

        {/* --- SEPARADOR --- */}
        <div className="my-3 border-t-2 border-neutral-300" />

        {/* --- DRE BS (mesma estrutura do Faturamento) --- */}
        <p className="text-xs font-medium uppercase text-neutral-500 mb-1">Resultado Beauty Smile</p>

        <DreRow
          label="+ Custos de Procedimentos"
          value={data.custosProcedimentos}
          base={baseDre}
          indent
        />
        <DreRow
          label="+ Custo de Mão de Obra"
          value={data.custoMaoObra}
          base={baseDre}
          indent
        />
        <DreRow
          label="+ Taxa Cartão (cobrada)"
          value={data.taxaCartaoCobrada}
          base={baseDre}
          indent
        />
        <DreRow
          label="+ Imposto NF (cobrado)"
          value={data.impostoNfCobrado}
          base={baseDre}
          indent
        />
        <DreRow
          label="+ Comissões Médicas"
          value={data.comissoesMedicas}
          base={baseDre}
          indent
        />
        <DreRow
          label="+ 60% Valor Líquido"
          value={data.valorBeautySmile60}
          base={baseDre}
          indent
        />
        <DreRow
          label="= Receita BS Bruta"
          value={data.receitaBsBruta}
          base={baseDre}
          highlight
        />

        {/* --- TAXA REAL --- */}
        <DreRow
          label="(-) Taxa Real Cartão"
          value={data.taxaRealCartao}
          base={baseDre}
          negative
        />
        <DreRow
          label="= Receita Pós Taxas"
          value={data.receitaPosTaxas}
          base={baseDre}
          highlight
        />

        {/* --- DEDUÇÕES --- */}
        {data.comissaoDentista > 0 && (
          <DreRow
            label="(-) Comissão Dentista"
            value={data.comissaoDentista}
            base={baseDre}
            negative
          />
        )}

        {hasDespesas && (
          <>
            {data.despesasPorCategoria.map((d) => (
              <DreRow
                key={d.categoriaId}
                label={`(-) ${d.categoria}`}
                value={d.total}
                base={baseDre}
                negative
                indent
              />
            ))}
            <DreRow
              label="(-) Total Despesas"
              value={data.totalDespesas}
              base={baseDre}
              negative
            />
          </>
        )}

        {/* --- SEPARADOR --- */}
        <div className="my-2 border-t-2 border-neutral-300" />

        {/* --- RESULTADO --- */}
        <DreRow
          label="= Resultado da Unidade"
          value={data.resultadoUnidade}
          base={baseDre}
          highlight
          highlightColor={resultadoPositivo ? "success" : "danger"}
        />
      </div>
    </div>
  );
}

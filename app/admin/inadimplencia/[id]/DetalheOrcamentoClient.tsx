"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrcamentoDetalhe } from "./actions";
import { HistoricoPagamentos } from "./HistoricoPagamentos";

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s + "T12:00:00").toLocaleDateString("pt-BR");
}

type Props = {
  orcamento: OrcamentoDetalhe;
  readOnly?: boolean;
  backHref?: string;
};

export function DetalheOrcamentoClient({ orcamento, readOnly = false, backHref = "/admin/inadimplencia" }: Props) {
  const router = useRouter();
  // Pagamentos são sincronizados automaticamente do Clinicorp

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-white/80">
        <Link href={backHref} className="text-white/90 hover:text-white underline-offset-2 hover:underline">
          ← Inadimplência
        </Link>
      </div>

      <h2 className="text-xl font-semibold text-white">Detalhe do orçamento</h2>

      <div className="rounded-lg border border-neutral-200 bg-white p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-neutral-500">Paciente</p>
            <p className="font-medium text-neutral-900">{orcamento.paciente_nome}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500">Telefone (cobrança)</p>
            <p className="font-medium text-neutral-900">
              {orcamento.paciente_telefone || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500">Clínica</p>
            <p className="font-medium text-neutral-900">{orcamento.clinica_nome}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500">Data fechamento</p>
            <p className="font-medium text-neutral-900">{formatDate(orcamento.data_fechamento)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500">Profissional</p>
            <p className="font-medium text-neutral-900">{orcamento.profissional || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500">Procedimentos</p>
            <p className="font-medium text-neutral-900 text-sm">
              {orcamento.procedimentos_texto || "—"}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-200 flex flex-wrap gap-4 items-center">
          <div>
            <p className="text-xs font-medium text-neutral-500">Valor total</p>
            <p className="text-lg font-bold text-neutral-900">{formatCurrency(orcamento.valor_total)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500">Valor pago</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(orcamento.valor_pago)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500">Saldo em aberto</p>
            <p className="text-lg font-bold text-amber-700">{formatCurrency(orcamento.valor_em_aberto)}</p>
          </div>
          <div className="ml-auto">
            {orcamento.valor_em_aberto > 0 && (
              <span className="text-xs text-neutral-500">
                Pagamentos sincronizados automaticamente
              </span>
            )}
          </div>
        </div>
      </div>

      <HistoricoPagamentos
        orcamentoFechadoId={orcamento.id}
        onEstornoSuccess={() => router.refresh()}
        readOnly={readOnly}
      />

    </div>
  );
}

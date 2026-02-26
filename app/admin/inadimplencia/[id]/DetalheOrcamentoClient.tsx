"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrcamentoDetalhe } from "./actions";
import { HistoricoPagamentos } from "./HistoricoPagamentos";
import { RegistrarPagamentoModal } from "@/components/pagamentos/RegistrarPagamentoModal";
import { useState } from "react";

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
  const [showRegistrarModal, setShowRegistrarModal] = useState(false);

  function handlePagamentoSuccess() {
    setShowRegistrarModal(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Link href={backHref} className="text-[#0A2463] hover:underline">
          ← Inadimplência
        </Link>
      </div>

      <h2 className="text-xl font-bold text-[#0A2463]">Detalhe do orçamento</h2>

      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Paciente</p>
            <p className="font-medium text-slate-900">{orcamento.paciente_nome}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Telefone (cobrança)</p>
            <p className="font-medium text-slate-900">
              {orcamento.paciente_telefone || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Clínica</p>
            <p className="font-medium text-slate-900">{orcamento.clinica_nome}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Data fechamento</p>
            <p className="font-medium text-slate-900">{formatDate(orcamento.data_fechamento)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Profissional</p>
            <p className="font-medium text-slate-900">{orcamento.profissional || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Procedimentos</p>
            <p className="font-medium text-slate-900 text-sm">
              {orcamento.procedimentos_texto || "—"}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-4 items-center">
          <div>
            <p className="text-xs font-medium text-slate-500">Valor total</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(orcamento.valor_total)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Valor pago</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(orcamento.valor_pago)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Saldo em aberto</p>
            <p className="text-lg font-bold text-amber-700">{formatCurrency(orcamento.valor_em_aberto)}</p>
          </div>
          <div className="ml-auto">
            {!readOnly && orcamento.valor_em_aberto > 0 && (
              <button
                type="button"
                onClick={() => setShowRegistrarModal(true)}
                className="rounded-md bg-[#0A2463] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Registrar pagamento
              </button>
            )}
          </div>
        </div>
      </div>

      <HistoricoPagamentos
        orcamentoFechadoId={orcamento.id}
        onEstornoSuccess={() => router.refresh()}
        readOnly={readOnly}
      />

      {!readOnly && showRegistrarModal && (
        <RegistrarPagamentoModal
          orcamentoId={orcamento.id}
          pacienteNome={orcamento.paciente_nome}
          valorTotal={orcamento.valor_total}
          valorEmAberto={orcamento.valor_em_aberto}
          clinicaId={orcamento.clinica_id}
          onSuccess={handlePagamentoSuccess}
          onClose={() => setShowRegistrarModal(false)}
        />
      )}
    </div>
  );
}

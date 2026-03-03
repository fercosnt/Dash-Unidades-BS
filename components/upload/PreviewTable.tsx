"use client";

import type { ParsedResult } from "./UploadForm";
import { formatCurrency, formatDate } from "@/lib/utils/formatting";

type PreviewTableProps = {
  result: ParsedResult;
  arquivoNome: string;
};

function cellClass(problematic: boolean) {
  return problematic ? "bg-amber-100" : "";
}

export function PreviewTable({ result, arquivoNome }: PreviewTableProps) {
  if (result.tipo === "orcamentos") {
    const { fechados, abertos } = result.data;
    const total = fechados.length + abertos.length;
    return (
      <div className="space-y-4">
        <p className="mt-1 text-sm text-white/80">
          <strong>{arquivoNome}</strong> — {fechados.length} fechados, {abertos.length} abertos ({total} registros)
        </p>
        {fechados.length > 0 && (
          <div>
            <h4 className="mb-2 font-medium text-white/90">Orçamentos fechados (APPROVED)</h4>
            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50">
                    <th className="px-3 py-2 text-left font-medium text-neutral-600">Paciente</th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-600">Valor total</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-600">Data</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-600">Indicação</th>
                  </tr>
                </thead>
                <tbody>
                  {fechados.map((r, i) => (
                    <tr key={i} className="border-t border-neutral-100">
                      <td className={`px-3 py-2 ${cellClass(!r.paciente_nome.trim())}`}>{r.paciente_nome || "—"}</td>
                      <td className={`px-3 py-2 text-right ${cellClass(r.valor_total === 0)}`}>{formatCurrency(r.valor_total)}</td>
                      <td className={`px-3 py-2 ${cellClass(!r.data_fechamento)}`}>{formatDate(r.data_fechamento)}</td>
                      <td className="px-3 py-2">{r.tem_indicacao ? "Sim" : "Não"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {abertos.length > 0 && (
          <div>
            <h4 className="mb-2 font-medium text-white/90">Orçamentos abertos</h4>
            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50">
                    <th className="px-3 py-2 text-left font-medium text-neutral-600">Paciente</th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-600">Valor total</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-600">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {abertos.map((r, i) => (
                    <tr key={i} className="border-t border-neutral-100">
                      <td className={`px-3 py-2 ${cellClass(!r.paciente_nome.trim())}`}>{r.paciente_nome || "—"}</td>
                      <td className={`px-3 py-2 text-right ${cellClass(r.valor_total === 0)}`}>{formatCurrency(r.valor_total)}</td>
                      <td className={`px-3 py-2 ${cellClass(!r.data_criacao)}`}>{formatDate(r.data_criacao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  const tratamentos = result.data;
  return (
    <div className="space-y-4">
      <p className="mt-1 text-sm text-white/80">
        <strong>{arquivoNome}</strong> — {tratamentos.length} registros (tratamentos executados)
      </p>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-neutral-50">
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Paciente</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Procedimento</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Data</th>
              <th className="px-3 py-2 text-right font-medium text-neutral-600">Valor</th>
            </tr>
          </thead>
          <tbody>
            {tratamentos.map((r, i) => (
              <tr key={i} className="border-t border-neutral-100">
                <td className={`px-3 py-2 ${cellClass(!r.paciente_nome.trim())}`}>{r.paciente_nome || "—"}</td>
                <td className={`px-3 py-2 ${cellClass(!r.procedimento_nome.trim())}`}>{r.procedimento_nome || "—"}</td>
                <td className={`px-3 py-2 ${cellClass(!r.data_execucao)}`}>{formatDate(r.data_execucao)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(r.valor ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

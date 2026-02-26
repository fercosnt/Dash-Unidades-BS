"use client";

import type { UploadStatusItem } from "@/types/dashboard.types";

type StatusUploadsProps = {
  items: UploadStatusItem[];
  className?: string;
};

export function StatusUploads({ items, className = "" }: StatusUploadsProps) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white overflow-hidden ${className}`}>
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">Status de uploads no mês</h3>
        <p className="text-xs text-slate-500 mt-0.5">Orç. fechados · Orç. abertos · Tratamentos</p>
      </div>
      <ul className="divide-y divide-slate-200">
        {items.length === 0 ? (
          <li className="px-4 py-3 text-sm text-slate-500">Nenhuma clínica cadastrada.</li>
        ) : (
          items.map((item) => {
            const count = [item.orcamentosFechados, item.orcamentosAbertos, item.tratamentos].filter(Boolean).length;
            const statusClass = count === 3 ? "bg-green-100 text-green-800" : count > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600";
            return (
              <li key={item.clinicaId} className="px-4 py-2 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-slate-900 truncate">{item.clinicaNome}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                  {count}/3
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

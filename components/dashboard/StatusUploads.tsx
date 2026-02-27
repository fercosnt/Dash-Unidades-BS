"use client";

import type { UploadStatusItem } from "@/types/dashboard.types";

type StatusUploadsProps = {
  items: UploadStatusItem[];
  className?: string;
};

export function StatusUploads({ items, className = "" }: StatusUploadsProps) {
  return (
    <div className={`rounded-lg bg-white shadow-md overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-neutral-100">
        <h3 className="text-sm font-heading font-bold text-neutral-900">Status de uploads no mês</h3>
        <p className="text-xs text-neutral-400 mt-0.5">Orç. fechados · Orç. abertos · Tratamentos</p>
      </div>
      <ul className="divide-y divide-neutral-100">
        {items.length === 0 ? (
          <li className="px-6 py-4 text-sm text-neutral-400">Nenhuma clínica cadastrada.</li>
        ) : (
          items.map((item) => {
            const count = [item.orcamentosFechados, item.orcamentosAbertos, item.tratamentos].filter(Boolean).length;
            const statusClass =
              count === 3
                ? "bg-success/10 text-success-700"
                : count > 0
                  ? "bg-warning/10 text-warning-700"
                  : "bg-neutral-100 text-neutral-500";
            return (
              <li key={item.clinicaId} className="px-6 py-3 flex items-center justify-between gap-2 text-sm hover:bg-neutral-50 transition-colors">
                <span className="font-medium text-neutral-800 truncate">{item.clinicaNome}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${statusClass}`}>
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

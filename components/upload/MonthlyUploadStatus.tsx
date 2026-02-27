"use client";

import { useState, useEffect } from "react";
import { getMonthlyUploadStatus, type ClinicaUploadStatus } from "@/app/admin/upload/actions";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatMonth(mesRef: string): string {
  const [y, m] = mesRef.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Check({ done }: { done: boolean }) {
  if (done) {
    return (
      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4 text-neutral-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

type Props = {
  initialStatus: ClinicaUploadStatus[];
  initialMes: string;
};

export function MonthlyUploadStatus({ initialStatus, initialMes }: Props) {
  const [mesRef, setMesRef] = useState(initialMes);
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mesRef === initialMes) {
      setStatus(initialStatus);
      return;
    }
    setLoading(true);
    getMonthlyUploadStatus(mesRef).then((s) => {
      setStatus(s);
      setLoading(false);
    });
  }, [mesRef, initialMes, initialStatus]);

  const totalClinicas = status.length;
  const completas = status.filter((s) => s.orcamentosFechados && s.orcamentosAbertos && s.tratamentos).length;

  const meses: string[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="rounded-xl bg-white shadow-md overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-heading font-bold text-neutral-800">Progresso de uploads</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {completas}/{totalClinicas} clínicas completas em {formatMonth(mesRef)}
          </p>
        </div>
        <select
          value={mesRef}
          onChange={(e) => setMesRef(e.target.value)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm"
        >
          {meses.map((m) => (
            <option key={m} value={m}>{formatMonth(m)}</option>
          ))}
        </select>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-3 pb-1">
        <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: totalClinicas > 0 ? `${(completas / totalClinicas) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-6 text-sm text-neutral-400 text-center">Carregando...</div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {status.map((clinic) => {
            const count = [clinic.orcamentosFechados, clinic.orcamentosAbertos, clinic.tratamentos].filter(Boolean).length;
            return (
              <div key={clinic.clinicaId} className="px-5 py-3 hover:bg-neutral-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-800 truncate">{clinic.clinicaNome}</span>
                  <span
                    className={`text-xs font-bold rounded-full px-2 py-0.5 ${
                      count === 3
                        ? "bg-green-100 text-green-700"
                        : count > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    {count}/3
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <Check done={clinic.orcamentosFechados} />
                    Orç. fechados
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check done={clinic.orcamentosAbertos} />
                    Orç. abertos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check done={clinic.tratamentos} />
                    Tratamentos
                  </span>
                </div>
              </div>
            );
          })}
          {status.length === 0 && (
            <div className="px-5 py-6 text-sm text-neutral-400 text-center">
              Nenhuma clínica ativa cadastrada.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

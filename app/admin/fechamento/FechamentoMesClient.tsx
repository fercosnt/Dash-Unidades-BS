"use client";

import { useState, useCallback } from "react";
import { UploadPageClient } from "../upload/UploadPageClient";
import { RevisaoProcedimentosClient } from "../upload/revisao/RevisaoProcedimentosClient";
import { UploadHistoryTable } from "../upload/historico/UploadHistoryTable";
import { FechamentoClient } from "../configuracoes/fechamento/FechamentoClient";
import type { ClinicaOption } from "@/components/shared/ClinicaSelect";
import type { TratamentoPendenteRow, ProcedimentoOption } from "../upload/revisao/actions";
import type { UploadBatchRow } from "../upload/actions";
import type { FechamentoMesItem } from "../configuracoes/fechamento/actions";

type Tab = "fechamento" | "historico";
type WizardStep = 1 | 2 | 3;
type HistoricoTab = "uploads" | "fechamentos";

type Props = {
  clinicas: ClinicaOption[];
  initialTratamentos: TratamentoPendenteRow[];
  procedimentos: ProcedimentoOption[];
  initialMeses: FechamentoMesItem[];
  initialBatches: UploadBatchRow[];
};

const STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "Upload" },
  { step: 2, label: "Revisao" },
  { step: 3, label: "Fechamento" },
];

export function FechamentoMesClient({
  clinicas,
  initialTratamentos,
  procedimentos,
  initialMeses,
  initialBatches,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("fechamento");
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [historicoTab, setHistoricoTab] = useState<HistoricoTab>("uploads");
  const [lastUploadMes, setLastUploadMes] = useState<string | undefined>();

  const handleUploadComplete = useCallback((_clinicaId: string, mesReferencia: string) => {
    setLastUploadMes(mesReferencia);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-heading font-bold text-white">Fechamento do Mes</h1>
        <p className="text-sm text-white/60 mt-1">
          Fluxo completo: upload, revisao de procedimentos e fechamento mensal.
        </p>
      </div>

      {/* Top-level tabs */}
      <div className="flex gap-1 rounded-lg bg-white/10 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("fechamento")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "fechamento"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          Fechamento
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("historico")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "historico"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          Historico
        </button>
      </div>

      {/* Tab: Fechamento (wizard) */}
      {activeTab === "fechamento" && (
        <div className="space-y-6">
          {/* Stepper */}
          <div className="flex items-center justify-center gap-0">
            {STEPS.map(({ step, label }, i) => (
              <div key={step} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setWizardStep(step)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                      wizardStep === step
                        ? "bg-white text-primary-700 shadow-md ring-2 ring-primary-400"
                        : "bg-white/20 text-white/80 group-hover:bg-white/30"
                    }`}
                  >
                    {step}
                  </span>
                  <span
                    className={`text-xs font-medium transition-colors ${
                      wizardStep === step ? "text-white" : "text-white/50 group-hover:text-white/70"
                    }`}
                  >
                    {label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className="mx-3 mb-5 h-px w-16 bg-white/20" />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          {wizardStep === 1 && (
            <UploadPageClient
              clinicas={clinicas}
              onUploadComplete={handleUploadComplete}
              compact
            />
          )}

          {wizardStep === 2 && (
            <RevisaoProcedimentosClient
              initialTratamentos={initialTratamentos}
              procedimentos={procedimentos}
              clinicas={clinicas}
              initialFilters={lastUploadMes ? { mes: lastUploadMes } : undefined}
              compact
            />
          )}

          {wizardStep === 3 && (
            <FechamentoClient initialMeses={initialMeses} compact />
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setWizardStep((s) => Math.max(1, s - 1) as WizardStep)}
              disabled={wizardStep === 1}
              className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => setWizardStep((s) => Math.min(3, s + 1) as WizardStep)}
              disabled={wizardStep === 3}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Tab: Historico */}
      {activeTab === "historico" && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-1 rounded-lg bg-white/10 p-1">
            <button
              type="button"
              onClick={() => setHistoricoTab("uploads")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                historicoTab === "uploads"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Uploads
            </button>
            <button
              type="button"
              onClick={() => setHistoricoTab("fechamentos")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                historicoTab === "fechamentos"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Fechamentos
            </button>
          </div>

          {historicoTab === "uploads" && (
            <UploadHistoryTable initialBatches={initialBatches} clinicas={clinicas} />
          )}

          {historicoTab === "fechamentos" && (
            <FechamentoClient initialMeses={initialMeses} compact />
          )}
        </div>
      )}
    </div>
  );
}

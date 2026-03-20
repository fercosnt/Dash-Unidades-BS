"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UploadForm, type ParsedResult, type ParsedPayload } from "@/components/upload/UploadForm";
import { PreviewTable } from "@/components/upload/PreviewTable";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { checkExistingBatches } from "./actions";
import type { ClinicaOption } from "@/components/shared/ClinicaSelect";

type Step = 1 | 2 | 3 | 4;

type Props = {
  clinicas: ClinicaOption[];
  onUploadComplete?: (clinicaId: string, mesReferencia: string) => void;
  compact?: boolean;
};

export function UploadPageClient({ clinicas, onUploadComplete, compact }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [arquivoNome, setArquivoNome] = useState("");
  const [clinicaId, setClinicaId] = useState("");
  const [mesReferencia, setMesReferencia] = useState("");
  const [tipoPlanilha, setTipoPlanilha] = useState<"orcamentos" | "tratamentos_executados">("orcamentos");
  const [substituir, setSubstituir] = useState(false);
  const [progressStatus, setProgressStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  function handleParsed(payload: ParsedPayload) {
    setParsedResult(payload.result);
    setArquivoNome(payload.arquivoNome);
    setClinicaId(payload.clinicaId);
    setMesReferencia(payload.mesReferencia);
    setTipoPlanilha(payload.tipoPlanilha);
    setStep(2);
  }

  async function handleConfirm() {
    if (!parsedResult || !clinicaId || !mesReferencia) return;

    const existing = await checkExistingBatches(clinicaId, mesReferencia, tipoPlanilha);
    const hasAny = existing.some((e) => e.exists);
    if (hasAny && !substituir) {
      setShowReplaceConfirm(true);
      return;
    }

    await doUpload();
  }

  async function doUpload(overrideSubstituir?: boolean) {
    if (!parsedResult || !clinicaId || !mesReferencia) return;
    setShowReplaceConfirm(false);
    setStep(3);
    setProgressStatus("sending");
    setErrorMessage("");

    let total = 0;
    try {
      if (parsedResult.tipo === "orcamentos") {
        const { fechados, abertos } = parsedResult.data;
        if (fechados.length > 0) {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clinica_id: clinicaId,
              mes_referencia: mesReferencia,
              tipo: "orcamentos_fechados",
              registros: fechados,
              arquivo_nome: arquivoNome,
              substituir: overrideSubstituir ?? substituir,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erro ao enviar orçamentos fechados");
          total += data.total_registros ?? fechados.length;
        }
        if (abertos.length > 0) {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clinica_id: clinicaId,
              mes_referencia: mesReferencia,
              tipo: "orcamentos_abertos",
              registros: abertos,
              arquivo_nome: arquivoNome,
              substituir: overrideSubstituir ?? substituir,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erro ao enviar orçamentos abertos");
          total += data.total_registros ?? abertos.length;
        }
      } else {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clinica_id: clinicaId,
            mes_referencia: mesReferencia,
            tipo: "tratamentos_executados",
            registros: parsedResult.data,
            arquivo_nome: arquivoNome,
            substituir: overrideSubstituir ?? substituir,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao enviar tratamentos");
        total = data.total_registros ?? parsedResult.data.length;
      }

      setTotalRegistros(total);
      setProgressStatus("success");
      setStep(4);
      onUploadComplete?.(clinicaId, mesReferencia);
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao enviar");
      setProgressStatus("error");
    }
  }

  function handleCancelPreview() {
    setParsedResult(null);
    setArquivoNome("");
    setStep(1);
  }

  function handleConfirmReplace() {
    setSubstituir(true);
    doUpload(true);
  }

  function handleNewUpload() {
    setParsedResult(null);
    setArquivoNome("");
    setClinicaId("");
    setMesReferencia("");
    setTipoPlanilha("orcamentos");
    setSubstituir(false);
    setProgressStatus("idle");
    setErrorMessage("");
    setTotalRegistros(0);
    setStep(1);
  }

  return (
    <div>
      {!compact && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Upload de planilhas</h2>
          <p className="mt-1 text-sm text-white/80">
            Selecione a clínica, o mês, o tipo e o arquivo XLSX. Os dados são processados no navegador antes do envio.
          </p>
        </div>
      )}

      {step === 1 && (
        <UploadForm
          clinicas={clinicas}
          onParsed={handleParsed}
          disabled={false}
        />
      )}

      {step === 2 && parsedResult && (
        <div className="space-y-4">
          <PreviewTable result={parsedResult} arquivoNome={arquivoNome} />
          <p className="text-sm text-white/80">Campos em amarelo podem precisar de atenção (vazios ou zerados).</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancelPreview}
              className="rounded-md bg-white/95 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Confirmar upload
            </button>
          </div>
        </div>
      )}

      {(step === 3 || step === 4) && (
        <div className="space-y-4">
          <UploadProgress
            status={progressStatus}
            totalRegistros={totalRegistros}
            errorMessage={errorMessage}
            onRetry={() => { setProgressStatus("sending"); doUpload(); }}
          />
          {step === 4 && progressStatus === "success" && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleNewUpload}
                className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Novo upload
              </button>
              {!compact && (
                <Link
                  href="/admin/upload/historico"
                  className="inline-flex items-center text-sm font-medium text-white/90 hover:text-white hover:underline"
                >
                  Ver histórico de uploads →
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {showReplaceConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Upload já existe</h3>
            <p className="text-neutral-600 text-sm mb-4">
              Já existe upload para esta clínica e mês. Deseja substituir os dados? Os registros antigos serão removidos.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReplaceConfirm(false)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReplace}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Sim, substituir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

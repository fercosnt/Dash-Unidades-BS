"use client";

type UploadProgressProps = {
  status: "idle" | "sending" | "success" | "error";
  totalRegistros?: number;
  errorMessage?: string;
  onRetry?: () => void;
};

export function UploadProgress({ status, totalRegistros, errorMessage, onRetry }: UploadProgressProps) {
  if (status === "idle") return null;

  if (status === "sending") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0A2463] border-t-transparent" />
        <p className="mt-4 text-slate-600">Enviando dados…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <p className="font-medium text-green-800">Upload concluído com sucesso!</p>
        {totalRegistros != null && (
          <p className="text-sm text-green-700 mt-1">{totalRegistros} registros importados.</p>
        )}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-800">Erro no processamento</p>
        {errorMessage && <p className="text-sm text-red-700 mt-1">{errorMessage}</p>}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  return null;
}

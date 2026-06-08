"use client";

import { useEffect } from "react";

/**
 * Estado de erro reutilizável pelos error boundaries (error.tsx) dos segmentos.
 * Loga o erro no console e oferece "Tentar novamente" (reset do boundary).
 */
export function ErrorState({
  error,
  reset,
  titulo = "Algo deu errado",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  titulo?: string;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="mb-1.5 font-heading text-lg font-bold text-neutral-900">{titulo}</h2>
        <p className="mb-6 text-sm text-neutral-600">
          Ocorreu um erro ao carregar esta página. Você pode tentar novamente.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-2.5 text-sm font-heading font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
        >
          Tentar novamente
        </button>
        {error?.digest && (
          <p className="mt-4 text-xs text-neutral-400">Ref: {error.digest}</p>
        )}
      </div>
    </div>
  );
}

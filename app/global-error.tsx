"use client";

/**
 * Boundary de último recurso: captura erros no próprio RootLayout.
 * Precisa renderizar <html>/<body> porque substitui o layout raiz.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f5f5" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, width: "100%", background: "#fff", borderRadius: 16, padding: 32, textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.08)" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#171717" }}>Algo deu errado</h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#525252" }}>
              Ocorreu um erro inesperado. Tente novamente.
            </p>
            <button
              onClick={reset}
              style={{ border: 0, borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#0d9488", cursor: "pointer" }}
            >
              Tentar novamente
            </button>
            {error?.digest && (
              <p style={{ marginTop: 16, fontSize: 12, color: "#a3a3a3" }}>Ref: {error.digest}</p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}

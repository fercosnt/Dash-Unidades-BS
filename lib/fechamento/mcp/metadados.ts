/**
 * OAuth Protected Resource Metadata (RFC 9728) do conector MCP. O authorization server é o
 * OAuth 2.1 Server do próprio projeto Supabase (issuer `<SUPABASE_URL>/auth/v1`).
 */

export const CAMINHO_MCP = "/api/mcp";
export const CAMINHO_METADADOS = "/.well-known/oauth-protected-resource";

/** Origem pública da requisição (Vercel preenche x-forwarded-*; cai para a URL da requisição). */
export function origemPublica(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || url.host;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function issuerSupabase(): string {
  return `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "")}/auth/v1`;
}

export function urlMetadadosRecurso(origem: string): string {
  return `${origem}${CAMINHO_METADADOS}${CAMINHO_MCP}`;
}

export function metadadosRecurso(origem: string) {
  return {
    resource: `${origem}${CAMINHO_MCP}`,
    authorization_servers: [issuerSupabase()],
    bearer_methods_supported: ["header"],
    resource_name: "Dash Unidades BS — fechamento mensal",
  };
}

/** Valor do header WWW-Authenticate para respostas 401/403 do MCP (RFC 6750 + RFC 9728). */
export function desafioBearer(origem: string, erro?: { codigo: "invalid_token" | "insufficient_scope"; descricao: string }): string {
  const partes = [`resource_metadata="${urlMetadadosRecurso(origem)}"`];
  if (erro) partes.unshift(`error="${erro.codigo}"`, `error_description="${erro.descricao}"`);
  return `Bearer ${partes.join(", ")}`;
}

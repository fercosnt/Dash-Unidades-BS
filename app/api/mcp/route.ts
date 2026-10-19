import { NextResponse } from "next/server";
import { extrairBearer, verificarTokenAdmin } from "@/lib/fechamento/auth";
import { desafioBearer, origemPublica } from "@/lib/fechamento/mcp/metadados";
import { atenderRequisicaoMcp } from "@/lib/fechamento/mcp/servidor";

/**
 * Conector MCP remoto do fechamento (Streamable HTTP, stateless) — plugin `bs-fechamento` 0.2.0.
 *
 * Auth: `Authorization: Bearer <access token>` emitido pelo OAuth 2.1 Server do Supabase
 * (consentimento em /oauth/consent). Exige profiles.role = 'admin'. Sem token → 401 com
 * `WWW-Authenticate` apontando para o Protected Resource Metadata (RFC 9728), que é como o
 * Claude descobre o login.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function handler(request: Request) {
  const origem = origemPublica(request);
  const token = extrairBearer(request);
  const auth = await verificarTokenAdmin(token);

  if (!auth.ok) {
    const desafio =
      auth.status === 403
        ? desafioBearer(origem, { codigo: "insufficient_scope", descricao: "admin only" })
        : desafioBearer(origem, token ? { codigo: "invalid_token", descricao: "invalid or expired token" } : undefined);
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: { "WWW-Authenticate": desafio } });
  }

  // Stateless: sem stream SSE standalone (GET) nem sessão para encerrar (DELETE).
  if (request.method !== "POST") {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null },
      { status: 405, headers: { Allow: "POST" } }
    );
  }

  return atenderRequisicaoMcp(request, { ctx: { admin: auth.admin, userId: auth.userId, usuario: auth.usuario }, email: auth.email });
}

export { handler as GET, handler as POST, handler as DELETE };

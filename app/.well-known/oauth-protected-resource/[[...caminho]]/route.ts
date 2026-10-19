import { NextResponse } from "next/server";
import { metadadosRecurso, origemPublica } from "@/lib/fechamento/mcp/metadados";

/**
 * OAuth Protected Resource Metadata (RFC 9728) do conector MCP `/api/mcp`.
 * Atende `/.well-known/oauth-protected-resource` e a variante com path
 * `/.well-known/oauth-protected-resource/api/mcp` (a que o WWW-Authenticate aponta).
 */

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function GET(request: Request) {
  return NextResponse.json(metadadosRecurso(origemPublica(request)), {
    headers: { ...CORS, "Cache-Control": "public, max-age=3600" },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

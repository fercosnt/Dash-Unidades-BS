import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type TokenAdmin =
  | { ok: true; userId: string; email: string | null; admin: AdminClient; usuario: SupabaseClient }
  | { ok: false; status: 401 | 403; error: string };

type AdminBearer =
  | { ok: true; userId: string; admin: AdminClient; usuario: SupabaseClient }
  | { ok: false; response: NextResponse };

/**
 * Client Supabase autenticado com o access token do próprio usuário (anon key + Bearer):
 * RLS e `is_admin()` valem. Usado só para RPCs com guard de tenant que barram o
 * service_role (ex.: `calcular_resultado_mensal_parceiro`, conta corrente).
 */
export function clienteDoUsuario(token: string): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Extrai o token de `Authorization: Bearer <token>` (string vazia se ausente). */
export function extrairBearer(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

/**
 * Valida um access token do Supabase (sessão normal ou emitido pelo OAuth Server do
 * Supabase para o conector MCP) e exige profiles.role = 'admin'.
 */
export async function verificarTokenAdmin(token: string): Promise<TokenAdmin> {
  if (!token) return { ok: false, status: 401, error: "Token ausente" };

  const admin = createSupabaseAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { ok: false, status: 401, error: "Token inválido ou expirado" };

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false, status: 403, error: "Acesso negado. Apenas admin." };

  return { ok: true, userId: user.id, email: user.email ?? null, admin, usuario: clienteDoUsuario(token) };
}

/**
 * Autentica as rotas /api/fechamento/* pelo access token do Supabase do próprio usuário
 * (`Authorization: Bearer <token>`), usado pelo plugin Claude — sem cookies e sem
 * service_role fora do servidor. Exige profiles.role = 'admin'.
 */
export async function requireAdminBearer(request: Request): Promise<AdminBearer> {
  const r = await verificarTokenAdmin(extrairBearer(request));
  if (!r.ok) return { ok: false, response: NextResponse.json({ error: r.error }, { status: r.status }) };
  return { ok: true, userId: r.userId, admin: r.admin, usuario: r.usuario };
}

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminBearer =
  | { ok: true; userId: string; admin: ReturnType<typeof createSupabaseAdminClient> }
  | { ok: false; response: NextResponse };

/**
 * Autentica as rotas /api/fechamento/* pelo access token do Supabase do próprio usuário
 * (`Authorization: Bearer <token>`), usado pelo plugin Claude — sem cookies e sem
 * service_role fora do servidor. Exige profiles.role = 'admin'.
 */
export async function requireAdminBearer(request: Request): Promise<AdminBearer> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Token ausente" }, { status: 401 }) };
  }

  const admin = createSupabaseAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) {
    return { ok: false, response: NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 }) };
  }

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Acesso negado. Apenas admin." }, { status: 403 }) };
  }

  return { ok: true, userId: user.id, admin };
}

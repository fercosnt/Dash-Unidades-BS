"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirectPermitido } from "@/lib/oauth/redirect";

/**
 * Decisão do consentimento OAuth (Aprovar / Recusar) do conector MCP.
 * Revalida tudo no servidor: sessão, papel admin e allowlist do redirect_uri do cliente.
 */
export async function decidirAutorizacao(formData: FormData) {
  const authorizationId = String(formData.get("authorization_id") ?? "");
  const decisao = String(formData.get("decisao") ?? "");
  const voltar = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
  if (!authorizationId) redirect("/oauth/consent");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(voltar)}`);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const { data: detalhes, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !detalhes) redirect(voltar);

  const aprovar =
    decisao === "aprovar" &&
    profile?.role === "admin" &&
    "authorization_id" in detalhes &&
    redirectPermitido(detalhes.redirect_uri);

  const { data } = aprovar
    ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });

  // Só devolve ao cliente se o destino estiver na allowlist; senão a página mostra o aviso
  if (data?.redirect_url && redirectPermitido(data.redirect_url)) redirect(data.redirect_url);
  redirect(`${voltar}&resultado=${aprovar ? "aprovado" : "recusado"}`);
}

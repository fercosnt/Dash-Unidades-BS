import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirectPermitido } from "@/lib/oauth/redirect";
import { decidirAutorizacao } from "./actions";

/**
 * Tela de consentimento do OAuth 2.1 Server do Supabase (authorization path configurado
 * no Supabase). O Claude abre esta página ao conectar o conector MCP `/api/mcp`.
 * Travas: só admin aprova; redirect_uri do cliente precisa estar na allowlist (Claude/loopback).
 */

export const dynamic = "force-dynamic";

export const metadata = { title: "Conectar ao Dash Unidades BS" };

type Props = { searchParams: Promise<{ authorization_id?: string; resultado?: string }> };

export default async function ConsentPage({ searchParams }: Props) {
  const { authorization_id: authorizationId, resultado } = await searchParams;
  if (!authorizationId) {
    return <Cartao titulo="Pedido inválido">Link de autorização sem <code>authorization_id</code>. Inicie a conexão de novo pelo Claude.</Cartao>;
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`);
  }

  const { data: profile } = await supabase.from("profiles").select("role, nome").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return (
      <Cartao titulo="Acesso negado">
        Só administradores da Beauty Smile podem conectar o Claude ao Dash Unidades BS. Você está logado como{" "}
        <strong>{user.email}</strong>.
      </Cartao>
    );
  }

  if (resultado) {
    return (
      <Cartao titulo={resultado === "aprovado" ? "Autorização registrada" : "Autorização recusada"}>
        {resultado === "aprovado"
          ? "A autorização foi registrada, mas o endereço de retorno do cliente não é do Claude, então não redirecionamos. Volte ao Claude e tente conectar de novo."
          : "O pedido foi recusado. Pode fechar esta janela."}
      </Cartao>
    );
  }

  const { data: detalhes, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !detalhes) {
    return <Cartao titulo="Pedido expirado ou inválido">{error?.message ?? "Inicie a conexão de novo pelo Claude."}</Cartao>;
  }

  // Já consentido antes: o Supabase devolve direto o retorno com o código
  if (!("authorization_id" in detalhes)) {
    if (redirectPermitido(detalhes.redirect_url)) redirect(detalhes.redirect_url);
    return <AvisoDestino destino={detalhes.redirect_url} />;
  }

  // Cliente fora da allowlist: recusa no Supabase e não redireciona
  if (!redirectPermitido(detalhes.redirect_uri)) {
    await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
    return <AvisoDestino destino={detalhes.redirect_uri} />;
  }

  const cliente = detalhes.client?.name || "Claude";
  const nome = profile?.nome || user.email;

  return (
    <Cartao titulo="Conectar ao Dash Unidades BS">
      <p>
        O <strong>{cliente}</strong> quer acessar o Dash Unidades BS como <strong>{nome}</strong> para fazer o fechamento
        mensal das clínicas parceiras.
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-neutral-600">
        <li>Ler o checklist, o catálogo e os números do mês.</li>
        <li>Gravar procedimentos, despesas, indicações e comissões, e fechar/reabrir o mês — sempre com prévia antes.</li>
      </ul>
      <p className="mt-4 text-xs text-neutral-500">
        Retorno: {hostDe(detalhes.redirect_uri)} · Conta: {user.email}
      </p>
      <form action={decidirAutorizacao} className="mt-6 flex gap-3">
        <input type="hidden" name="authorization_id" value={detalhes.authorization_id} />
        <button
          type="submit"
          name="decisao"
          value="aprovar"
          className="inline-flex flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
        >
          Aprovar
        </button>
        <button
          type="submit"
          name="decisao"
          value="recusar"
          className="inline-flex flex-1 items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50"
        >
          Recusar
        </button>
      </form>
    </Cartao>
  );
}

function hostDe(uri: string) {
  try {
    return new URL(uri).host;
  } catch {
    return uri;
  }
}

function AvisoDestino({ destino }: { destino: string }) {
  return (
    <Cartao titulo="Cliente não autorizado">
      O pedido veio de um aplicativo cujo endereço de retorno (<code className="break-all">{hostDe(destino)}</code>) não é do
      Claude. Por segurança, o acesso foi recusado. Se você não iniciou essa conexão, ignore esta página.
    </Cartao>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-900 via-primary-800 to-sky-600 px-4">
      <section className="w-full max-w-lg rounded-3xl bg-white px-8 py-10 text-sm leading-relaxed text-neutral-800 shadow-2xl ring-1 ring-black/5 sm:px-10">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary-600">Beauty Smile Partners</p>
        <h1 className="mb-4 text-lg font-semibold text-neutral-900">{titulo}</h1>
        <div>{children}</div>
      </section>
    </main>
  );
}

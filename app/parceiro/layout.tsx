import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  icons: {
    icon: "/favicon-equipe.svg",
  },
};

const PARCEIRO_SIDEBAR_GROUPS = [
  {
    label: "Principal",
    items: [
      { href: "/parceiro/dashboard", label: "Dashboard" },
      { href: "/parceiro/orcamentos", label: "Orçamentos" },
      { href: "/parceiro/financeiro", label: "Financeiro" },
      { href: "/parceiro/inadimplencia", label: "Inadimplência" },
    ],
  },
];

export default async function ParceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  let user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
    if (code === "refresh_token_not_found") redirect("/login");
    throw err;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, email, clinica_id")
    .eq("id", user?.id ?? "")
    .single();

  let userRole = "Parceiro";
  if (profile?.clinica_id) {
    const { data: clinica } = await supabase
      .from("clinicas_parceiras")
      .select("nome")
      .eq("id", profile.clinica_id)
      .single();
    if (clinica?.nome) userRole = clinica.nome;
  }

  const authDisplayName = typeof user?.user_metadata?.display_name === "string"
    ? user.user_metadata.display_name
    : "";
  const displayName = profile?.nome || authDisplayName || "Parceiro";

  return (
    <div className="flex min-h-screen gap-2 bg-[url('/background-gradient-1.png')] bg-cover bg-fixed bg-center">
      <Sidebar
        groups={PARCEIRO_SIDEBAR_GROUPS}
        homeHref="/parceiro/dashboard"
        homeLabel="Beauty Smile"
        variant="parceiro"
      />
      <div className="flex flex-1 flex-col min-w-0 pr-2">
        <Header userName={displayName} userRole={userRole} variant="parceiro" />
        <main className="flex-1 p-6 scrollbar-light overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

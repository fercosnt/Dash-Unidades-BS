import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

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
  const supabase = createSupabaseServerClient();
  let user: { id: string; email?: string | null } | null = null;
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

  let subtitle = "Painel parceiro";
  if (profile?.clinica_id) {
    const { data: clinica } = await supabase
      .from("clinicas_parceiras")
      .select("nome")
      .eq("id", profile.clinica_id)
      .single();
    if (clinica?.nome) subtitle = clinica.nome;
  }

  const displayName = profile?.nome || profile?.email || user?.email || "Parceiro";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        groups={PARCEIRO_SIDEBAR_GROUPS}
        homeHref="/parceiro/dashboard"
        homeLabel="Beauty Smile"
      />
      <div className="flex flex-1 flex-col min-w-0">
        <Header title={displayName} subtitle={subtitle} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

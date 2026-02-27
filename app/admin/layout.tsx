import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { countPendentesRevisao } from "./upload/revisao/actions";
import { redirect } from "next/navigation";

// Evita cache do layout para sempre mostrar o usuário logado correto no header
export const dynamic = "force-dynamic";


const ADMIN_SIDEBAR_GROUPS_BASE = [
  {
    label: "Principal",
    items: [
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: "/admin/upload", label: "Upload" },
      { href: "/admin/upload/historico", label: "Histórico de uploads" },
      { href: "/admin/upload/revisao", label: "Revisão de procedimentos", badge: 0 as number },
      { href: "/admin/pagamentos", label: "Projeção de recebimentos" },
      { href: "/admin/inadimplencia", label: "Inadimplência" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { href: "/admin/configuracoes/clinicas", label: "Clínicas" },
      { href: "/admin/configuracoes/procedimentos", label: "Procedimentos" },
      { href: "/admin/configuracoes/medicos", label: "Médicos" },
      { href: "/admin/configuracoes/financeiro", label: "Financeiro" },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  let user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
    if (code === "refresh_token_not_found") redirect("/login");
    throw err;
  }

  if (!user) {
    redirect("/login");
  }

  let displayName = user.email ?? "Admin";
  let userRole = "Administrador";
  let pendentes = 0;
  try {
    const [profileResult, pendentesCount] = await Promise.all([
      supabase.from("profiles").select("nome, email, role").eq("id", user.id).single(),
      countPendentesRevisao(),
    ]);
    const profile = profileResult.data;
    pendentes = pendentesCount;
    const authDisplayName = typeof user?.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : "";
    displayName = profile?.nome || authDisplayName || "Admin";
    userRole = profile?.role === "admin" ? "Administrador" : "Parceiro";
  } catch {
    // Se falhar perfil ou contador, segue com o que temos
  }

  const groups = ADMIN_SIDEBAR_GROUPS_BASE.map((group) => ({
    ...group,
    items: group.items.map((item) =>
      item.href === "/admin/upload/revisao" ? { ...item, badge: pendentes } : item
    ),
  }));

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <Sidebar groups={groups} variant="admin" />
      <div className="flex flex-1 flex-col min-w-0">
        <Header userName={displayName} userRole={userRole} variant="admin" />
        <main className="flex-1 p-6 scrollbar-light overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

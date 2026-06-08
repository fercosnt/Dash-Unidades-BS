import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { countPendentesRevisao } from "./upload/revisao/actions";
import { redirect } from "next/navigation";

// Evita cache do layout para sempre mostrar o usuário logado correto no header
export const dynamic = "force-dynamic";

export const metadata = {
  icons: {
    icon: "/favicon-admin.svg",
  },
};


const ADMIN_SIDEBAR_GROUPS_BASE = [
  {
    label: "Principal",
    items: [
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: "/admin/fechamento", label: "Fechamento do Mês", badge: 0 as number },
      { href: "/admin/pagamentos", label: "Projeção de recebimentos" },
      { href: "/admin/inadimplencia", label: "Inadimplência" },
      { href: "/admin/repasses", label: "Conta Corrente" },
      { href: "/admin/comissoes-dentista", label: "Comissões Dentista" },
      { href: "/admin/comissoes", label: "Comissões Médicos" },
      { href: "/admin/despesas", label: "Despesas" },
      { href: "/admin/upload", label: "Sincronização" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { href: "/admin/configuracoes/clinicas", label: "Clínicas" },
      { href: "/admin/configuracoes/procedimentos", label: "Procedimentos" },
      { href: "/admin/configuracoes/medicos", label: "Médicos" },
      { href: "/admin/configuracoes/financeiro", label: "Financeiro" },
      { href: "/admin/configuracoes/debitos", label: "Débitos parceiros" },
      { href: "/admin/configuracoes/categorias-despesa", label: "Categorias Despesa" },
      { href: "/admin/configuracoes/taxas-cartao", label: "Taxas Cartão" },
      { href: "/admin/configuracoes/dentistas", label: "Dentistas" },
      { href: "/admin/configuracoes/usuarios", label: "Usuários" },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, email, role")
    .eq("id", user.id)
    .single();

  // Guard de papel: não-admin NÃO acessa a área admin.
  // IMPORTANTE: fora de try/catch — redirect() funciona lançando NEXT_REDIRECT, e
  // um catch que não re-lança engoliria o redirect (era o bug pego pelo E2E).
  // Fail-closed: sem perfil admin confirmado, manda para a área do parceiro.
  if (profile?.role !== "admin") {
    redirect("/parceiro/dashboard");
  }

  const authDisplayName = typeof user?.user_metadata?.display_name === "string"
    ? user.user_metadata.display_name
    : "";
  const displayName = profile?.nome || authDisplayName || "Admin";
  const userRole = "Administrador";

  // Contador de pendentes é não-crítico: se falhar, segue com 0.
  let pendentes = 0;
  try {
    pendentes = await countPendentesRevisao();
  } catch {
    // não-crítico
  }

  const groups = ADMIN_SIDEBAR_GROUPS_BASE.map((group) => ({
    ...group,
    items: group.items.map((item) =>
      item.href === "/admin/fechamento" ? { ...item, badge: pendentes } : item
    ),
  }));

  return (
    <div className="flex min-h-screen gap-2 bg-[url('/68a4d045b130b34b3614881d.jpeg')] bg-cover bg-fixed bg-center print:bg-none print:bg-white print:gap-0">
      <Sidebar groups={groups} variant="admin" />
      <div className="flex flex-1 flex-col min-w-0 pr-2 print:pr-0">
        <Header userName={displayName} userRole={userRole} variant="admin" />
        <main className="flex-1 p-6 scrollbar-light overflow-y-auto print:p-0 print:overflow-visible">{children}</main>
      </div>
    </div>
  );
}

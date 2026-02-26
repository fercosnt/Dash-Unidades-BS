"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type HeaderProps = {
  title: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Sair
        </button>
      </div>
    </header>
  );
}

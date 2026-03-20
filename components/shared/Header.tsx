"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type HeaderProps = {
  userName: string;
  userRole: string;
  variant?: "admin" | "parceiro";
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function Header({ userName, userRole }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-end px-6 bg-[#05071F]/96 backdrop-blur-md shadow-[0_10px_30px_rgba(3,7,18,0.85)] rounded-bl-3xl rounded-br-3xl print:hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold bg-white text-primary-600">
          {getInitials(userName)}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium leading-tight text-white">
            {userName}
          </p>
          <p className="text-[11px] leading-tight text-white/60">
            {userRole}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="ml-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/90 transition-colors hover:bg-white/20"
        >
          Sair
        </button>
      </div>
    </header>
  );
}

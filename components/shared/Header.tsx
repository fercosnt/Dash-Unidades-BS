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

export function Header({ userName, userRole, variant = "admin" }: HeaderProps) {
  const router = useRouter();
  const isAdmin = variant === "admin";

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <header
      className={`sticky top-0 z-10 flex h-14 items-center justify-between px-6 ${
        isAdmin
          ? "bg-primary-900 text-white"
          : "bg-white text-neutral-900 shadow-sm"
      }`}
    >
      <div />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
              isAdmin
                ? "bg-white/15 text-white"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {getInitials(userName)}
          </div>
          <div className="text-right">
            <p
              className={`text-sm font-medium leading-tight ${
                isAdmin ? "text-white" : "text-neutral-800"
              }`}
            >
              {userName}
            </p>
            <p
              className={`text-[11px] leading-tight ${
                isAdmin ? "text-white/50" : "text-neutral-400"
              }`}
            >
              {userRole}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            isAdmin
              ? "text-white/60 hover:bg-white/10 hover:text-white"
              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
          }`}
        >
          Sair
        </button>
      </div>
    </header>
  );
}

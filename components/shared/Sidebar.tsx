"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; badge?: number };
type NavGroup = { label: string; items: NavItem[] };

type SidebarProps = {
  groups: NavGroup[];
  homeHref?: string;
  homeLabel?: string;
  className?: string;
};

export function Sidebar({ groups, homeHref = "/admin/dashboard", homeLabel = "Beauty Smile", className = "" }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col ${className}`}
    >
      <div className="p-4 border-b border-slate-200">
        <Link href={homeHref} className="font-semibold text-[#0A2463]">
          {homeLabel}
        </Link>
      </div>
      <nav className="p-3 flex-1 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              {group.label}
            </p>
            <ul className="mt-1 space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[#0A2463] text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        {item.label}
                        {item.badge != null && item.badge > 0 && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              isActive ? "bg-white/20" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

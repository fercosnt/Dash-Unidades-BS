"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = { href: string; label: string; badge?: number; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

type SidebarProps = {
  groups: NavGroup[];
  homeHref?: string;
  homeLabel?: string;
  variant?: "admin" | "parceiro";
  className?: string;
};

export function Sidebar({
  groups,
  homeHref = "/admin/dashboard",
  homeLabel = "Beauty Smile",
  variant = "admin",
  className = "",
}: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = variant === "admin";
   const [collapsed, setCollapsed] = useState(false);

  // Collect all hrefs to detect when a more specific sibling matches
  const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));

  function checkActive(item: NavItem): boolean {
    if (pathname === item.href) return true;
    if (item.exact) return false;
    if (!pathname.startsWith(item.href + "/")) return false;
    // If another sibling item is a more specific prefix match, this one isn't active
    const hasBetterMatch = allHrefs.some(
      (h) => h !== item.href && h.startsWith(item.href + "/") && (pathname === h || pathname.startsWith(h + "/"))
    );
    return !hasBetterMatch;
  }

  return (
    <aside
      className={`relative shrink-0 flex flex-col ${
        isAdmin
          ? "bg-primary-900 text-white"
          : "bg-white text-neutral-900"
      } ${collapsed ? "w-16" : "w-60"} transition-all duration-300 ease-in-out ${className}`}
    >
      {/* Logo / Brand — h-14 matches the Header height */}
      <div
        className={`flex shrink-0 ${
          collapsed ? "flex-col items-center pt-5 pb-3 gap-3 px-2" : "items-center justify-between pt-5 pb-3 px-3"
        }`}
      >
        <Link
          href={homeHref}
          className={`flex items-center gap-3 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {/* Icon: chart bar — financial identity */}
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              isAdmin ? "bg-white/10" : ""
            }`}
          >
            <svg
              className={`h-5 w-5 ${isAdmin ? "text-white" : "text-primary-600"}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          </div>
          {!collapsed && (
            <div>
              <p
                className={`text-sm font-semibold leading-tight ${
                  isAdmin ? "text-white" : "text-neutral-800"
                }`}
              >
                {homeLabel}
              </p>
              <p
                className={`text-[10px] leading-tight ${
                  isAdmin ? "text-white/40" : "text-neutral-400"
                }`}
              >
                Partners
              </p>
            </div>
          )}
        </Link>
        <button
          type="button"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          onClick={() => setCollapsed((v) => !v)}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
            isAdmin
              ? "bg-white/10 text-white hover:bg-white/20"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          {collapsed ? (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Navigation */}
          <nav
            className={`flex-1 overflow-y-auto px-3 py-4 ${
              isAdmin ? "scrollbar-dark" : "scrollbar-light"
            }`}
          >
            {groups.map((group) => (
              <div key={group.label} className="mb-5">
                <p
                  className={`px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest ${
                    isAdmin ? "text-white/40" : "text-neutral-400"
                  }`}
                >
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = checkActive(item);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${
                            isAdmin
                              ? isActive
                                ? "bg-white/15 text-white shadow-glass"
                                : "text-white/70 hover:bg-white/[0.08] hover:text-white"
                              : isActive
                                ? "bg-accent/10 text-accent-700 font-semibold"
                                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                          }`}
                        >
                          <span>{item.label}</span>
                          {item.badge != null && item.badge > 0 && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isAdmin
                                  ? "bg-secondary text-white"
                                  : "bg-warning-100 text-warning-700"
                              }`}
                            >
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div
            className={`px-5 py-3 text-[10px] ${
              isAdmin ? "text-white/30" : "text-neutral-400"
            }`}
          >
            Beauty Smile Partners
          </div>
        </>
      )}
    </aside>
  );
}

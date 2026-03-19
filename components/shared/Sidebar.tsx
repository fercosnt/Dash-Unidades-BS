"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const REDE_LINKS_EXTERNOS = [
  { href: "https://beautysleep.bslabs.com.br/", label: "Beauty Sleep", sublabel: "Protótipo", external: true },
];

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
  const [redeOpen, setRedeOpen] = useState(false);
  const redeRef = useRef<HTMLDivElement>(null);

  const redeLinks = REDE_LINKS_EXTERNOS;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (redeRef.current && !redeRef.current.contains(e.target as Node)) setRedeOpen(false);
    }
    if (redeOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [redeOpen]);

  const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));

  function checkActive(item: NavItem): boolean {
    if (!pathname) return false;
    if (pathname === item.href) return true;
    if (item.exact) return false;
    if (!pathname.startsWith(item.href + "/")) return false;
    const hasBetterMatch = allHrefs.some(
      (h) => h !== item.href && h.startsWith(item.href + "/") && (pathname === h || pathname.startsWith(h + "/"))
    );
    return !hasBetterMatch;
  }

  return (
    <aside
      className={`relative shrink-0 flex flex-col bg-gradient-to-b from-primary-950 via-[#151938] to-[#05071F] text-white shadow-[8px_0_24px_rgba(3,7,18,0.75)] ${
        collapsed ? "w-16" : "w-60"
      } transition-all duration-300 ease-in-out print:hidden ${className}`}
    >
      <div
        ref={redeRef}
        className={`relative flex shrink-0 flex-col pt-5 pb-2 ${
          collapsed ? "items-center gap-3 px-2" : "px-3"
        }`}
      >
        <button
          type="button"
          onClick={() => setRedeOpen((v) => !v)}
          className={`flex items-center gap-3 rounded-xl outline-none focus:outline-none ${
            collapsed ? "justify-center" : ""
          }`}
          aria-expanded={redeOpen}
          aria-haspopup="true"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#35bfad] via-primary-500 to-[#00109e] shadow-[0_0_0_1px_rgba(255,255,255,0.18)] transition-transform duration-200 hover:scale-110 hover:shadow-[0_0_12px_rgba(53,191,173,0.4)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 503 503"
              className="h-5 w-5 text-white"
              fill="currentColor"
            >
              <path d="M370.78,157.27c34.37,2.31,66.48,21.12,88.29,47.16,3.62,4.32,6.51,9.34,9.97,13.76.54.69-.02,1.55,1.94,1.08,7.79-32.74,7.7-67.09-4.46-98.71-27.82-72.4-108.52-107.48-182.36-88.1-.48,1.97.4,1.4,1.08,1.94,14.32,11.32,24.91,18.13,36.14,33.44,30.36,41.35,35.34,106.16.97,146.73-11.74,13.86-37.46,32.4-52.14,11.44-14.73-21.04,13.38-46.73,29.83-56.67,6.29-3.8,13.61-6.42,19.63-10.09,7.21-44.56-14.65-83.49-51.71-106.76-2.57-1.62-15.26-9.25-17.13-8.84-36.29,17.18-64.32,48.76-68.6,89.84l-24.59-2.52c3.7-40.04,27.05-76.18,61.13-96.81.25-2.19,0-1.35-1.23-1.71C121.1,4.12,20.17,81.26,25.98,182.28l-20.32,31.04c-.64-4.44-1.83-8.83-2.44-13.28C-10.89,96.2,63.23,8.05,167.42,2.74c29.01-1.48,57.76,4.61,84.83,14.38,58.59-22.44,123.84-19.49,176.03,16.84,72.88,50.72,89.29,138.77,57.54,219.26-20.18,51.16-58.16,85.54-113.81,93.22-1.94-.34-1.1-5.88-1.34-7.76-.73-5.6-2.04-11.13-2.92-16.68,20.75-3.32,39.84-10.45,56.43-23.42,15.38-12.02,27.47-29.35,34.56-47.47-16.03-37.71-49.99-64.74-91-70.02l3.03-23.81Z" />
              <path d="M132.17,156.43l3.04,24.65c-40.9,5.32-75.13,31.97-90.49,70.09,13.89,38.68,49.82,66.36,90.85,69.99l-4.28,24.59c-39.9-4.56-77.47-27.32-98.04-61.95-1.53.71-3.84,13.57-4.27,16.11-17.97,105.2,67.65,189.49,172.14,173.83,4.46-.67,13.87-1.99,17.68-3.55.48-.2,1.16-.69.39-1.27-11.26-8.48-21.11-15.49-30.56-26.32-33.83-38.79-43.7-100.56-15.2-145.15,10.87-17.01,40.27-46.59,58.92-22.55,16.51,21.28-13.97,48.98-31.14,58.83-3.28,1.88-16.36,7.18-17.64,8.69-.75.89-1.08,1.85-1.26,2.99-2.13,13.66.1,30.13,4.18,43.27,9.91,31.9,34.74,55.6,64.26,69.83,37.14-15.36,65.47-49.03,69.98-89.73l24.57,2.48c-5.99,65.86-57.22,105.32-117.19,121.85C104.36,527.23-13.88,433.71,3.23,303.88c9.38-71.17,52.46-139.02,128.94-147.45Z" />
              <path d="M290.12,496.93l30.35-21.01c87.01,3.97,161.79-68.14,155.78-155.83l21.05-28.64c15.21,66.35-11.74,137.18-66.81,176.46-40.36,28.79-91.74,38.58-140.38,29.02Z" />
              <path d="M345.31,346.63c-26.78-2.1-58.48-16.01-73.05-39.46-17.92-28.87,7.56-53.33,35.97-33.42,22.06,15.47,35.77,46.41,37.08,72.88Z" />
              <path d="M158.89,155.78c26.94,2,62.23,18.13,74.49,43.37,11.75,24.19-8.11,44.32-32.46,32.46-22.83-11.12-39.12-42.87-42.3-67.24-.24-1.8-1.52-8.33.27-8.59Z" />
            </svg>
          </div>
          {!collapsed && (
            <div className="flex flex-col items-start text-left">
              <p className="text-sm font-semibold leading-tight text-white">
                {homeLabel}
              </p>
              <p className="text-[10px] leading-tight text-white/50 flex items-center gap-1">
                Partners
                <svg className={`h-3.5 w-3.5 text-white/50 transition-transform ${redeOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </p>
            </div>
          )}
        </button>
        {redeOpen && (
          <div className="absolute left-0 top-full z-[100] mt-1 w-52 rounded-lg border border-white/15 bg-[#0f172a] shadow-xl overflow-hidden">
            <p className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/40 text-center">
              Sites da rede
            </p>
            <div className="py-1">
              {redeLinks.map((item) => (
                "external" in item && item.external ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-4 py-2.5 text-sm font-medium text-white/95 hover:bg-white/10 transition-colors whitespace-nowrap"
                    onClick={() => setRedeOpen(false)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block w-full px-4 py-2.5 text-sm font-medium text-white/95 hover:bg-white/10 transition-colors whitespace-nowrap"
                    onClick={() => setRedeOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </div>
          </div>
        )}
      </div>
      <div className={`flex shrink-0 items-center ${collapsed ? "justify-center pb-3 px-2" : "justify-end pb-3 pr-3"}`}>
        <button
          type="button"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold bg-white/10 text-white/80 border border-white/25 shadow-[0_0_0_1px_rgba(15,23,42,0.6)] transition-colors hover:bg-white/20 hover:text-white"
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
          <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-light">
            {groups.map((group) => (
              <div key={group.label} className="mb-5">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-white">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = checkActive(item);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                            isActive
                              ? "bg-white/20 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
                              : "text-white/70 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <span>{item.label}</span>
                          {item.badge != null && item.badge > 0 && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-white/10 text-white">
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

          <div className="px-5 py-3 text-[10px] text-white/40">Beauty Smile Partners</div>
        </>
      )}
    </aside>
  );
}

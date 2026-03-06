import type React from "react";

type KpiCardProps = {
  label: string;
  value: number;
  format: "currency" | "percent" | "number";
  previousValue?: number;
  icon?: "money" | "receive" | "pending" | "alert" | "chart" | "percent";
  accentColor?: "primary" | "accent" | "secondary" | "success" | "warning" | "danger";
  className?: string;
};

function formatValue(value: number, format: "currency" | "percent" | "number"): string {
  if (format === "currency") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  if (format === "percent") {
    return `${value.toFixed(1)}%`;
  }
  return new Intl.NumberFormat("pt-BR").format(value);
}

const ACCENT_BG = {
  primary: "bg-primary-600/10",
  accent: "bg-accent/10",
  secondary: "bg-secondary/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  danger: "bg-danger/10",
} as const;

const ACCENT_TEXT = {
  primary: "text-primary-600",
  accent: "text-accent-600",
  secondary: "text-secondary-600",
  success: "text-success-700",
  warning: "text-warning-700",
  danger: "text-danger-700",
} as const;

const ICONS: Record<string, React.ReactNode> = {
  money: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  receive: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  ),
  pending: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  alert: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  chart: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  percent: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
};

export function KpiCard({
  label,
  value,
  format,
  previousValue,
  icon = "money",
  accentColor = "primary",
  className = "",
}: KpiCardProps) {
  const trend =
    previousValue != null && previousValue !== 0
      ? ((value - previousValue) / previousValue) * 100
      : null;

  return (
    <div
      className={`rounded-xl bg-white p-5 shadow-md hover:shadow-lg transition-all duration-200 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 mb-3 min-h-[2rem]">
            {label}
          </p>
          <p
            className={`font-heading font-semibold text-neutral-900 leading-tight ${
              format === "currency"
                ? "text-lg sm:text-xl"
                : "text-xl sm:text-2xl"
            }`}
          >
            {formatValue(value, format)}
          </p>
          {trend != null && (
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  trend >= 0
                    ? "bg-success/10 text-success-700"
                    : "bg-danger/10 text-danger-700"
                }`}
              >
                {trend >= 0 ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                ) : (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" /></svg>
                )}
                {Math.abs(trend).toFixed(1)}%
              </span>
              <span className="text-[11px] text-neutral-400">vs anterior</span>
            </div>
          )}
        </div>
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${ACCENT_BG[accentColor]} ${ACCENT_TEXT[accentColor]}`}>
          {ICONS[icon] ?? ICONS.money}
        </div>
      </div>
    </div>
  );
}

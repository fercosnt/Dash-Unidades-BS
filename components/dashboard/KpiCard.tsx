type KpiCardProps = {
  label: string;
  value: number;
  format: "currency" | "percent" | "number";
  previousValue?: number;
  className?: string;
};

function formatValue(value: number, format: "currency" | "percent" | "number"): string {
  if (format === "currency") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }
  if (format === "percent") {
    return `${value.toFixed(1)}%`;
  }
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function KpiCard({ label, value, format, previousValue, className = "" }: KpiCardProps) {
  const trend = previousValue != null && previousValue !== 0
    ? ((value - previousValue) / previousValue) * 100
    : null;

  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {formatValue(value, format)}
      </p>
      {trend != null && (
        <p className={`mt-1 text-xs ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
          {trend >= 0 ? "+" : ""}{trend.toFixed(1)}% em relação ao período anterior
        </p>
      )}
    </div>
  );
}

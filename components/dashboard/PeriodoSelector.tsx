"use client";

type PeriodoSelectorProps = {
  selectedPeriodo: string;
  onChange: (periodo: string) => void;
  className?: string;
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function PeriodoSelector({ selectedPeriodo, onChange, className = "" }: PeriodoSelectorProps) {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    options.push({
      value: `${y}-${m}`,
      label: `${MONTHS[d.getMonth()]}/${y}`,
    });
  }

  return (
    <select
      value={selectedPeriodo}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 bg-white ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

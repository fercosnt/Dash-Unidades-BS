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
      className={`rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-all focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 ${className}`}
    >
      <option value="all">Resumo Geral</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

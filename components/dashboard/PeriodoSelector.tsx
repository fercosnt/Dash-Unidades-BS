"use client";

type PeriodoSelectorProps = {
  selectedPeriodo: string;
  onChange: (periodo: string) => void;
  mesesFechados?: string[];
  className?: string;
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const OPTIONS_2026 = MONTHS.map((label, i) => ({
  value: `2026-${String(i + 1).padStart(2, "0")}`,
  label: `${label}/2026`,
}));

export function PeriodoSelector({ selectedPeriodo, onChange, mesesFechados = [], className = "" }: PeriodoSelectorProps) {
  const fechados = new Set(mesesFechados);

  return (
    <select
      value={selectedPeriodo}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-all focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 ${className}`}
    >
      <option value="all">Todos os meses</option>
      {OPTIONS_2026.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {fechados.has(opt.value) ? `\u2705 ${opt.label}` : opt.label}
        </option>
      ))}
    </select>
  );
}

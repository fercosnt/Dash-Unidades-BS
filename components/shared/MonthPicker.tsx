"use client";

type MonthPickerProps = {
  value: string;
  onChange: (firstDayOfMonth: string) => void;
  disabled?: boolean;
  className?: string;
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function MonthPicker({
  value,
  onChange,
  disabled = false,
  className = "",
}: MonthPickerProps) {
  const [y, m] = value ? value.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  const year = y || new Date().getFullYear();
  const month = m || 1;

  const handleMonthChange = (newMonth: number) => {
    const firstDay = `${year}-${String(newMonth).padStart(2, "0")}-01`;
    onChange(firstDay);
  };

  const handleYearChange = (newYear: number) => {
    const firstDay = `${newYear}-${String(month).padStart(2, "0")}-01`;
    onChange(firstDay);
  };

  const years = Array.from({ length: 5 }, (_, i) => year - 2 + i);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <select
        value={month}
        onChange={(e) => handleMonthChange(Number(e.target.value))}
        disabled={disabled}
        className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-[#0A2463] focus:ring-1 focus:ring-[#0A2463]"
      >
        {MONTHS.map((label, i) => (
          <option key={i} value={i + 1}>{label}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => handleYearChange(Number(e.target.value))}
        disabled={disabled}
        className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-[#0A2463] focus:ring-1 focus:ring-[#0A2463]"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}

/** Formata "YYYY-MM-DD" (primeiro dia do mês) para exibição "Março/2026" */
export function formatMonthRef(isoFirstDay: string): string {
  if (!isoFirstDay) return "—";
  const [y, m] = isoFirstDay.split("-").map(Number);
  const monthName = MONTHS[(m ?? 1) - 1];
  return `${monthName}/${y ?? ""}`;
}

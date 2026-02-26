"use client";

export type ClinicaOption = { id: string; nome: string };

type ClinicaSelectProps = {
  value: string;
  onChange: (clinicaId: string) => void;
  clinicas: ClinicaOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function ClinicaSelect({
  value,
  onChange,
  clinicas,
  placeholder = "Selecione a clínica",
  disabled = false,
  className = "",
}: ClinicaSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-[#0A2463] focus:ring-1 focus:ring-[#0A2463] ${className}`}
    >
      <option value="">{placeholder}</option>
      {clinicas.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nome}
        </option>
      ))}
    </select>
  );
}

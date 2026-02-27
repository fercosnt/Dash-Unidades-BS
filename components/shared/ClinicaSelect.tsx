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
      className={`rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 ${className}`}
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

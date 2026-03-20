"use client";

type ClinicaSelectorProps = {
  clinicas: { id: string; nome: string }[];
  selectedClinicaId: string;
  onChange: (clinicaId: string) => void;
  className?: string;
};

export function ClinicaSelector({ clinicas, selectedClinicaId, onChange, className = "" }: ClinicaSelectorProps) {
  return (
    <select
      value={selectedClinicaId}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-all focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 ${className}`}
    >
      <option value="">Todas as Unidades</option>
      {clinicas.map((c) => (
        <option key={c.id} value={c.id}>{c.nome}</option>
      ))}
    </select>
  );
}

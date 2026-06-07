"use client";
import Link from "next/link";
import type { SaldoParceiro } from "@/lib/saldo-parceiro-queries";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

/** Lista "Saldo por parceiro" — 1 linha por clínica ativa, com link p/ a Conta Corrente (RF-08). */
export function SaldoParceiros({ saldos }: { saldos: SaldoParceiro[] }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-md">
      <div className="border-b border-neutral-100 px-6 py-4">
        <h3 className="text-sm font-bold text-neutral-900">Saldo por parceiro</h3>
      </div>
      {saldos.length === 0 ? (
        <p className="px-6 py-6 text-center text-sm text-neutral-400">Nenhuma clínica ativa.</p>
      ) : (
        <ul className="divide-y divide-neutral-50">
          {saldos.map((s) => (
            <li key={s.clinicaId}>
              <Link
                href={`/admin/repasses?clinica=${s.clinicaId}`}
                className="flex items-center justify-between px-6 py-3 text-sm hover:bg-neutral-50"
              >
                <span className="text-neutral-800">{s.nome}</span>
                <span
                  className={`font-medium tabular-nums ${
                    s.saldo > 0 ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {formatCurrency(s.saldo)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

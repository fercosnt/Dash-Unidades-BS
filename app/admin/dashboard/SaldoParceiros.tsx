import Link from "next/link";
import { fetchSaldosParceiros } from "@/lib/saldo-parceiro-queries";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

/** Lista "Saldo por parceiro" — 1 linha por clínica ativa, com link p/ a Conta Corrente (RF-08). */
export async function SaldoParceiros() {
  const saldos = await fetchSaldosParceiros();
  if (saldos.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-md">
      <div className="border-b border-neutral-100 px-6 py-4">
        <h3 className="text-sm font-bold text-neutral-900">Saldo por parceiro</h3>
      </div>
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
    </div>
  );
}

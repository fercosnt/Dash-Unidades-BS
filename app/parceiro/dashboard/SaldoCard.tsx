import Link from "next/link";
import { fetchContaCorrente } from "@/lib/saldo-parceiro-queries";
import { getClinicaIdDoParceiro } from "@/lib/auth/parceiro-clinica";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

/** Card compacto de saldo da conta corrente no dashboard do parceiro (RF-08). */
export async function SaldoCard() {
  const clinicaId = await getClinicaIdDoParceiro();
  if (!clinicaId) return null;
  const conta = await fetchContaCorrente(clinicaId);

  return (
    <Link
      href="/parceiro/financeiro"
      className="block rounded-xl bg-white p-5 shadow-md transition-shadow hover:shadow-lg"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
          Saldo da conta corrente
        </p>
        <span className="text-xs text-primary-600">ver extrato →</span>
      </div>
      <p
        className={`mt-2 text-2xl font-bold tabular-nums ${
          conta.saldo > 0 ? "text-green-700" : "text-red-600"
        }`}
      >
        {formatCurrency(conta.saldo)}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-500">
        {conta.dividaImplementacao && (
          <span>
            Implementação a amortizar:{" "}
            <strong className="text-neutral-700">
              {formatCurrency(conta.dividaImplementacao.aAmortizar)}
            </strong>
          </span>
        )}
        <span>
          Operacional acumulado:{" "}
          <strong className={conta.operacionalAcumulado >= 0 ? "text-green-700" : "text-red-600"}>
            {formatCurrency(conta.operacionalAcumulado)}
          </strong>
        </span>
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        {conta.saldo > 0
          ? "BS deve a você."
          : "Você recebe em dinheiro quando o saldo ficar positivo."}
      </p>
    </Link>
  );
}

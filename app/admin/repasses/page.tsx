import { fetchContaCorrente } from "@/lib/saldo-parceiro-queries";
import { getClinicasAtivas } from "../upload/actions";
import { ContaCorrenteClient } from "./RepassesClient";

export default async function ContaCorrentePage({
  searchParams,
}: {
  searchParams: Promise<{ clinica?: string }>;
}) {
  const params = await searchParams;
  const clinicas = await getClinicasAtivas();
  const clinicaId = params.clinica || clinicas[0]?.id || "";
  const conta = clinicaId ? await fetchContaCorrente(clinicaId) : null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Conta Corrente</h2>
        <p className="mt-1 text-sm text-white/80">
          Saldo único do parceiro — abre com a taxa de implementação e é alimentado pelo resultado
          mensal (caixa real). Negativo = parceiro deve à BS.
        </p>
      </div>
      <ContaCorrenteClient clinicas={clinicas} clinicaSelecionada={clinicaId} conta={conta} />
    </div>
  );
}

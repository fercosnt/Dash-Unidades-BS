import {
  getResumoMes,
  getHistoricoResumos,
  getMesesComResumo,
} from "./actions";
import { fetchContaCorrente, type ContaCorrente } from "@/lib/saldo-parceiro-queries";
import { getClinicaIdDoParceiro } from "@/lib/auth/parceiro-clinica";
import { FinanceiroParceiroClient } from "./FinanceiroParceiroClient";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ParceiroFinanceiroPage() {
  const meses = await getMesesComResumo();
  const mesRef = meses[0] ?? currentMonth();

  const clinicaId = await getClinicaIdDoParceiro();
  const [resumo, historico, conta] = await Promise.all([
    getResumoMes(mesRef),
    getHistoricoResumos(12),
    clinicaId ? fetchContaCorrente(clinicaId) : Promise.resolve<ContaCorrente | null>(null),
  ]);

  const mesesList = meses.length > 0 ? meses : [currentMonth()];

  return (
    <FinanceiroParceiroClient
      meses={mesesList}
      initialMes={mesRef}
      initialResumo={resumo}
      historico={historico}
      conta={conta}
    />
  );
}

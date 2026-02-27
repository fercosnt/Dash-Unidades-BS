import {
  getResumoMes,
  getHistoricoResumos,
  getMesesComResumo,
} from "./actions";
import { FinanceiroParceiroClient } from "./FinanceiroParceiroClient";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ParceiroFinanceiroPage() {
  const meses = await getMesesComResumo();
  const mesRef = meses[0] ?? currentMonth();

  const [resumo, historico] = await Promise.all([
    getResumoMes(mesRef),
    getHistoricoResumos(12),
  ]);

  const mesesList = meses.length > 0 ? meses : [currentMonth()];

  return (
    <FinanceiroParceiroClient
      meses={mesesList}
      initialMes={mesRef}
      initialResumo={resumo}
      historico={historico}
    />
  );
}

import {
  getOrcamentosFechados,
  getOrcamentosAbertos,
  getOrcamentosKpis,
  getMesesDisponiveis,
} from "./actions";
import { OrcamentosParceiroClient } from "./OrcamentosParceiroClient";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ParceiroOrcamentosPage() {
  const meses = await getMesesDisponiveis();
  const mesRef = meses[0] ?? currentMonth();

  const [fechados, abertos, kpis] = await Promise.all([
    getOrcamentosFechados(mesRef),
    getOrcamentosAbertos(mesRef),
    getOrcamentosKpis(mesRef),
  ]);

  const mesesList = meses.length > 0 ? meses : [currentMonth()];

  return (
    <OrcamentosParceiroClient
      meses={mesesList}
      initialMes={mesRef}
      initialFechados={fechados}
      initialAbertos={abertos}
      initialKpis={kpis}
    />
  );
}

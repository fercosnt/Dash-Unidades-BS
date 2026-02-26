import { getConfigVigente, getHistoricoConfig } from "./actions";
import { FinanceiroClient } from "./FinanceiroClient";

export default async function FinanceiroPage() {
  const [vigente, historico] = await Promise.all([
    getConfigVigente(),
    getHistoricoConfig(),
  ]);

  return (
    <FinanceiroClient vigente={vigente} historico={historico} />
  );
}

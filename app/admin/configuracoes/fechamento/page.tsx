import { fetchFechamentoStatus } from "./actions";
import { FechamentoClient } from "./FechamentoClient";

export default async function FechamentoPage() {
  const meses = await fetchFechamentoStatus();

  return <FechamentoClient initialMeses={meses} />;
}

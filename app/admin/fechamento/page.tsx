import { getClinicasAtivas, listUploadBatches } from "../upload/actions";
import {
  listTratamentosSemProcedimento,
  getProcedimentosAtivos,
} from "../upload/revisao/actions";
import { fetchFechamentoStatus } from "../configuracoes/fechamento/actions";
import { FechamentoMesClient } from "./FechamentoMesClient";

export const dynamic = "force-dynamic";

export default async function FechamentoMesPage() {
  const [clinicas, tratamentos, procedimentos, meses, batches] =
    await Promise.all([
      getClinicasAtivas(),
      listTratamentosSemProcedimento({}),
      getProcedimentosAtivos(),
      fetchFechamentoStatus(),
      listUploadBatches({}),
    ]);

  return (
    <FechamentoMesClient
      clinicas={clinicas}
      initialTratamentos={tratamentos}
      procedimentos={procedimentos}
      initialMeses={meses}
      initialBatches={batches}
    />
  );
}

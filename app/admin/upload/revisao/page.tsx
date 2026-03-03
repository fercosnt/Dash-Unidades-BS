import { getClinicasAtivas } from "../actions";
import { listTratamentosSemProcedimento, getProcedimentosAtivos } from "./actions";
import { RevisaoProcedimentosClient } from "./RevisaoProcedimentosClient";

export default async function RevisaoProcedimentosPage() {
  const [tratamentos, procedimentos, clinicas] = await Promise.all([
    listTratamentosSemProcedimento({}),
    getProcedimentosAtivos(),
    getClinicasAtivas(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Revisão de procedimentos</h2>
        <p className="mt-1 text-sm text-white/80">
          Tratamentos importados sem vínculo com o cadastro de procedimentos. Vincule a um procedimento existente ou crie um novo.
        </p>
      </div>
      <RevisaoProcedimentosClient
        initialTratamentos={tratamentos}
        procedimentos={procedimentos}
        clinicas={clinicas}
      />
    </div>
  );
}

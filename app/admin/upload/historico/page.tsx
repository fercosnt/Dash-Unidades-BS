import { listUploadBatches, getClinicasAtivas } from "../actions";
import { UploadHistoryTable } from "./UploadHistoryTable";

export default async function HistoricoUploadsPage() {
  const [initialBatches, clinicas] = await Promise.all([
    listUploadBatches({}),
    getClinicasAtivas(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-neutral-800">Histórico de uploads</h2>
        <p className="text-neutral-600 text-sm mt-1">
          Lista de envios por clínica, mês e tipo. Clique em uma linha para ver os registros do batch.
        </p>
      </div>
      <UploadHistoryTable initialBatches={initialBatches} clinicas={clinicas} />
    </div>
  );
}

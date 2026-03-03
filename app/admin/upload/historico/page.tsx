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
        <h2 className="text-xl font-semibold text-white">Histórico de uploads</h2>
        <p className="mt-1 text-sm text-white/80">
          Lista de envios por clínica, mês e tipo. Clique em uma linha para ver os registros do batch.
        </p>
      </div>
      <UploadHistoryTable initialBatches={initialBatches} clinicas={clinicas} />
    </div>
  );
}

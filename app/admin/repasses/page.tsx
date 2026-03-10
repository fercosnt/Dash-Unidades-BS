import { fetchRepassesPendentes, fetchRepassesFeitos } from "@/lib/repasse-queries";
import { RepassesClient } from "./RepassesClient";

export default async function RepassesPage() {
  const [pendentes, feitos] = await Promise.all([fetchRepassesPendentes(), fetchRepassesFeitos()]);
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Repasses Mensais</h2>
        <p className="mt-1 text-sm text-white/80">
          Registre a transferência mensal para cada clínica parceira.
        </p>
      </div>
      <RepassesClient pendentes={pendentes} feitos={feitos} />
    </div>
  );
}

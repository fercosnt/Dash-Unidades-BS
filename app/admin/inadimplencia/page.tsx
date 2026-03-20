import { listInadimplentes, getKpisInadimplencia } from "./actions";
import { getClinicasAtivas } from "../upload/actions";
import { InadimplenciaClient } from "./InadimplenciaClient";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function InadimplenciaPage() {
  const [initialList, initialKpis, clinicas] = await Promise.all([
    listInadimplentes({}),
    getKpisInadimplencia(),
    getClinicasAtivas(),
  ]);

  return (
    <InadimplenciaClient
      initialList={initialList}
      initialKpis={initialKpis}
      clinicas={clinicas}
    />
  );
}

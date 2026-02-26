import { listInadimplentes, getKpisInadimplencia } from "./actions";
import { getClinicasAtivas } from "../upload/actions";
import { InadimplenciaClient } from "./InadimplenciaClient";

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

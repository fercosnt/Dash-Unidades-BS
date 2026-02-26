import { getProjecaoRecebimentos } from "./actions";
import { getClinicasAtivas } from "../upload/actions";
import { ProjecaoClient } from "./ProjecaoClient";

export default async function ProjecaoRecebimentosPage() {
  const [initialList, clinicas] = await Promise.all([
    getProjecaoRecebimentos({}),
    getClinicasAtivas(),
  ]);

  return (
    <ProjecaoClient initialList={initialList} clinicas={clinicas} />
  );
}

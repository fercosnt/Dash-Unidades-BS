import { listarMedicos, listarClinicasAtivas } from "./actions";
import { MedicosClient } from "./MedicosClient";

type SearchParams = { clinica?: string };

export default async function MedicosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const clinicaFilter = (searchParams?.clinica as string) || "";

  const [medicos, clinicas] = await Promise.all([
    listarMedicos(clinicaFilter || undefined),
    listarClinicasAtivas(),
  ]);

  return (
    <MedicosClient
      medicos={medicos}
      clinicas={clinicas}
      clinicaFilter={clinicaFilter}
    />
  );
}

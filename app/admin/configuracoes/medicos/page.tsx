import { listarMedicos, listarClinicasAtivas } from "./actions";
import { MedicosClient } from "./MedicosClient";

type SearchParams = { clinica?: string };

export default async function MedicosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { clinica } = await searchParams;
  const clinicaFilter = (clinica as string) || "";

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

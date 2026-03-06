import { listarClinicas } from "./actions";
import { ClinicasClient } from "./ClinicasClient";

type SearchParams = { status?: string };

export default async function ClinicasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { status } = await searchParams;
  const statusFilter =
    status === "ativa" ? "ativa" : status === "inativa" ? "inativa" : "todas";
  const clinicas = await listarClinicas(statusFilter);

  return (
    <ClinicasClient clinicas={clinicas} statusFilter={statusFilter} />
  );
}

import { listarUsuarios, listarClinicasAtivas } from "./actions";
import { UsuariosClient } from "./UsuariosClient";

type SearchParams = { status?: string };

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { status } = await searchParams;
  const statusFilter =
    status === "ativo" ? "ativo" : status === "inativo" ? "inativo" : "todos";

  const [usuarios, clinicas] = await Promise.all([
    listarUsuarios(statusFilter),
    listarClinicasAtivas(),
  ]);

  return (
    <UsuariosClient
      usuarios={usuarios}
      clinicas={clinicas}
      statusFilter={statusFilter}
    />
  );
}

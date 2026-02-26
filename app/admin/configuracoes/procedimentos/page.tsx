import { listarProcedimentos, listarCategoriasProcedimentos } from "./actions";
import { ProcedimentosClient } from "./ProcedimentosClient";

type SearchParams = { status?: string; categoria?: string };

export default async function ProcedimentosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const status = (searchParams?.status as string) || "todos";
  const statusFilter = status === "ativo" || status === "inativo" ? status : "todos";
  const categoriaFilter = (searchParams?.categoria as string) || "";

  const [procedimentos, categorias] = await Promise.all([
    listarProcedimentos({ categoria: categoriaFilter || undefined, status: statusFilter }),
    listarCategoriasProcedimentos(),
  ]);

  return (
    <ProcedimentosClient
      procedimentos={procedimentos}
      categorias={categorias}
      statusFilter={statusFilter}
      categoriaFilter={categoriaFilter}
    />
  );
}

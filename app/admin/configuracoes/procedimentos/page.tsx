import { listarProcedimentos, listarCategoriasProcedimentos } from "./actions";
import { ProcedimentosClient } from "./ProcedimentosClient";

type SearchParams = { status?: string; categoria?: string };

export default async function ProcedimentosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { status: rawStatus, categoria } = await searchParams;
  const status = (rawStatus as string) || "todos";
  const statusFilter = status === "ativo" || status === "inativo" ? status : "todos";
  const categoriaFilter = (categoria as string) || "";

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

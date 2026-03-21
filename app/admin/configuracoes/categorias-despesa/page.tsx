import { fetchTodasCategorias } from "./actions";
import { CategoriasClient } from "./CategoriasClient";

export default async function CategoriasDespesaPage() {
  const categorias = await fetchTodasCategorias();

  return <CategoriasClient categorias={categorias} />;
}

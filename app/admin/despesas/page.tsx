import { fetchClinicas } from "./actions";
import { fetchCategoriasAtivas, fetchDespesasPorMes, calcularDreBsUnidade } from "@/lib/despesas-queries";
import { DespesasClient } from "./DespesasClient";

export default async function DespesasPage() {
  const mesAtual = new Date().toISOString().slice(0, 7) + "-01";
  const mesFiltro = mesAtual.slice(0, 7); // YYYY-MM

  const [clinicas, categorias, despesas, dreBs] = await Promise.all([
    fetchClinicas(),
    fetchCategoriasAtivas(),
    fetchDespesasPorMes(mesFiltro),
    calcularDreBsUnidade(mesFiltro),
  ]);

  return (
    <DespesasClient
      clinicas={clinicas}
      categorias={categorias}
      initialDespesas={despesas}
      initialDreBs={dreBs}
      initialMes={mesFiltro}
    />
  );
}

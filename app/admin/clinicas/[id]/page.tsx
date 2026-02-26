import { notFound } from "next/navigation";
import {
  getClinicaById,
  getResumoClinicaMes,
  getOrcamentosFechadosClinicaMes,
  getOrcamentosAbertosClinicaMes,
  getTratamentosClinicaMes,
} from "./actions";
import { ClinicaDetailClient } from "./ClinicaDetailClient";

function getDefaultMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type PageProps = { params: Promise<{ id: string }> };

export default async function ClinicaDetailPage({ params }: PageProps) {
  const { id } = await params;
  const clinica = await getClinicaById(id);
  if (!clinica) notFound();

  const mes = getDefaultMes();
  const [resumo, orcamentosFechados, orcamentosAbertos, tratamentos] = await Promise.all([
    getResumoClinicaMes(id, mes),
    getOrcamentosFechadosClinicaMes(id, mes),
    getOrcamentosAbertosClinicaMes(id, mes),
    getTratamentosClinicaMes(id, mes),
  ]);

  return (
    <ClinicaDetailClient
      clinica={clinica}
      initialMes={mes}
      initialResumo={resumo}
      initialOrcamentosFechados={orcamentosFechados}
      initialOrcamentosAbertos={orcamentosAbertos}
      initialTratamentos={tratamentos}
    />
  );
}

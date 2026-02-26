import { getOrcamentoDetalhe } from "@/app/admin/inadimplencia/[id]/actions";
import { DetalheOrcamentoClient } from "@/app/admin/inadimplencia/[id]/DetalheOrcamentoClient";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function DetalheOrcamentoParceiroPage({ params }: Props) {
  const { id } = await params;
  const orcamento = await getOrcamentoDetalhe(id);
  if (!orcamento) notFound();

  return (
    <DetalheOrcamentoClient
      orcamento={orcamento}
      readOnly
      backHref="/parceiro/inadimplencia"
    />
  );
}
